"""
Runetrace GetLogs Lambda — Production
Queries DynamoDB with pagination and optional time range filtering.
"""
import json
import os
import boto3
from boto3.dynamodb.conditions import Key, Attr
from decimal import Decimal

# ── Config ──────────────────────────────────────────
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = os.environ.get('TABLE_NAME', 'LLMLogs')
table = dynamodb.Table(TABLE_NAME)

DEFAULT_LIMIT = 100
MAX_LIMIT = 500


class DecimalEncoder(json.JSONEncoder):
    """Convert DynamoDB Decimals to Python floats for JSON serialization."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)


def _cors_headers():
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }


def _response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': _cors_headers(),
        'body': json.dumps(body, cls=DecimalEncoder),
    }


def lambda_handler(event, context):
    request_id = context.aws_request_id if context else 'local'

    try:
        params = event.get('queryStringParameters', {}) or {}
        project_id = params.get('project_id')

        if not project_id:
            return _response(400, {'error': 'project_id query parameter is required'})

        # ── Pagination ──────────────────────────────
        limit = min(int(params.get('limit', DEFAULT_LIMIT)), MAX_LIMIT)
        last_key = params.get('last_key')

        # ── Time range filtering ────────────────────
        start_time = params.get('start_time')  # Unix timestamp
        end_time = params.get('end_time')      # Unix timestamp

        # Build key condition
        if start_time and end_time:
            key_condition = (
                Key('project_id').eq(project_id) &
                Key('timestamp').between(Decimal(start_time), Decimal(end_time))
            )
        elif start_time:
            key_condition = (
                Key('project_id').eq(project_id) &
                Key('timestamp').gte(Decimal(start_time))
            )
        elif end_time:
            key_condition = (
                Key('project_id').eq(project_id) &
                Key('timestamp').lte(Decimal(end_time))
            )
        else:
            key_condition = Key('project_id').eq(project_id)

        # Build query kwargs
        query_kwargs = {
            'KeyConditionExpression': key_condition,
            'Limit': limit,
            'ScanIndexForward': False,  # Newest first
        }

        # Resume from last_key if provided (cursor-based pagination)
        if last_key:
            try:
                query_kwargs['ExclusiveStartKey'] = json.loads(last_key, parse_float=Decimal)
            except (json.JSONDecodeError, TypeError):
                return _response(400, {'error': 'Invalid last_key format'})

        response = table.query(**query_kwargs)
        items = response.get('Items', [])

        result = {
            'logs': items,
            'count': len(items),
        }

        # Include cursor for next page if more items exist
        if 'LastEvaluatedKey' in response:
            result['last_key'] = json.dumps(response['LastEvaluatedKey'], cls=DecimalEncoder)
            result['has_more'] = True
        else:
            result['has_more'] = False

        print(json.dumps({
            'level': 'INFO',
            'msg': 'logs_queried',
            'request_id': request_id,
            'project_id': project_id,
            'count': len(items),
        }))

        return _response(200, result)

    except Exception as e:
        print(json.dumps({
            'level': 'ERROR',
            'msg': str(e),
            'request_id': request_id,
        }))
        return _response(500, {'error': 'Internal server error'})
