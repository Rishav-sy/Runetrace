"""
Runetrace Ingest Lambda — Production
Validates, authenticates, and writes LLM usage logs to DynamoDB.
"""
import json
import time
import os
import re
import boto3
from decimal import Decimal

# ── Config ──────────────────────────────────────────
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'LLMLogs')
LOG_RETENTION_DAYS = int(os.environ.get('LOG_RETENTION_DAYS', '90'))
API_KEY = os.environ.get('API_KEY', '')
table = dynamodb.Table(TABLE_NAME)

MAX_PAYLOAD_BYTES = 10 * 1024  # 10 KB
PROJECT_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,64}$')

REQUIRED_FIELDS = {
    'project_id': str,
}

OPTIONAL_FIELDS = {
    'model': str,
    'prompt_tokens': (int, float),
    'completion_tokens': (int, float),
    'latency_ms': (int, float),
    'cost': (int, float),
    'prompt': str,
    'response': str,
    'function_name': str,
    'session_id': str,
    'trace_id': str,
    'user_id': str,
    'tags': list,
    'metadata': dict,
}


def _cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }


def _response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': _cors_headers(),
        'body': json.dumps(body),
    }


def lambda_handler(event, context):
    request_id = context.aws_request_id if context else 'local'

    try:
        # ── API Key Authentication ──────────────────
        if API_KEY:
            headers = event.get('headers', {}) or {}
            # API Gateway lowercases all headers
            provided_key = headers.get('x-api-key', '')
            if provided_key != API_KEY:
                print(json.dumps({'level': 'WARN', 'msg': 'unauthorized', 'request_id': request_id}))
                return _response(403, {'error': 'Forbidden: invalid API key'})

        # ── Payload size check ──────────────────────
        raw_body = event.get('body', '{}') or '{}'
        if len(raw_body.encode('utf-8')) > MAX_PAYLOAD_BYTES:
            return _response(400, {'error': f'Payload too large (max {MAX_PAYLOAD_BYTES} bytes)'})

        body = json.loads(raw_body)

        if not isinstance(body, dict):
            return _response(400, {'error': 'Body must be a JSON object'})

        # ── Validate required fields ────────────────
        for field, expected_type in REQUIRED_FIELDS.items():
            if field not in body:
                return _response(400, {'error': f'Missing required field: {field}'})
            if not isinstance(body[field], expected_type):
                return _response(400, {'error': f'Field {field} must be {expected_type.__name__}'})

        # ── Sanitize project_id ─────────────────────
        if not PROJECT_ID_PATTERN.match(body['project_id']):
            return _response(400, {
                'error': 'project_id must be 1-64 chars, alphanumeric, hyphens, or underscores only'
            })

        # ── Validate optional fields ────────────────
        for field, expected_type in OPTIONAL_FIELDS.items():
            if field in body and not isinstance(body[field], expected_type):
                return _response(400, {'error': f'Field {field} has invalid type'})

        # ── Truncate text fields ────────────────────
        if 'prompt' in body:
            body['prompt'] = str(body['prompt'])[:500]
        if 'response' in body:
            body['response'] = str(body['response'])[:500]

        # ── Server-side timestamp + TTL ─────────────
        now = time.time()
        body['timestamp'] = now
        body['expiry'] = int(now + (LOG_RETENTION_DAYS * 86400))

        # ── Convert floats → Decimal for DynamoDB ───
        json_str = json.dumps(body)
        item = json.loads(json_str, parse_float=Decimal)

        table.put_item(Item=item)

        print(json.dumps({
            'level': 'INFO',
            'msg': 'log_ingested',
            'request_id': request_id,
            'project_id': body['project_id'],
            'model': body.get('model', 'unknown'),
        }))

        return _response(200, {'message': 'Log ingested successfully'})

    except json.JSONDecodeError:
        return _response(400, {'error': 'Invalid JSON body'})
    except Exception as e:
        print(json.dumps({
            'level': 'ERROR',
            'msg': str(e),
            'request_id': request_id,
        }))
        return _response(500, {'error': 'Internal server error'})
