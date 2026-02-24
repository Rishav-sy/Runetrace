terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_prefix
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ──────────────────────────────────────────────
# DynamoDB
# ──────────────────────────────────────────────

resource "aws_dynamodb_table" "llm_logs" {
  name         = var.table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "project_id"
  range_key    = "timestamp"

  attribute {
    name = "project_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  ttl {
    attribute_name = "expiry"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }
}

# ──────────────────────────────────────────────
# IAM
# ──────────────────────────────────────────────

data "aws_caller_identity" "current" {}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_role" {
  name               = "${var.project_prefix}_lambda_role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

data "aws_iam_policy_document" "lambda_policy" {
  # DynamoDB — scoped to this table only
  statement {
    actions = [
      "dynamodb:PutItem",
      "dynamodb:Query"
    ]
    resources = [aws_dynamodb_table.llm_logs.arn]
  }

  # CloudWatch Logs — scoped to these function log groups only
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = [
      "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.project_prefix}_*:*"
    ]
  }
}

resource "aws_iam_role_policy" "lambda_policy" {
  name   = "${var.project_prefix}_lambda_policy"
  role   = aws_iam_role.lambda_role.id
  policy = data.aws_iam_policy_document.lambda_policy.json
}

# ──────────────────────────────────────────────
# Lambda Functions
# ──────────────────────────────────────────────

data "archive_file" "backend_zip" {
  type        = "zip"
  source_dir  = "${path.module}/../backend"
  output_path = "${path.module}/backend.zip"
}

resource "aws_lambda_function" "ingest" {
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  function_name    = "${var.project_prefix}_ingest"
  role             = aws_iam_role.lambda_role.arn
  handler          = "ingest.lambda_handler"
  runtime          = "python3.12"
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory

  environment {
    variables = {
      TABLE_NAME         = aws_dynamodb_table.llm_logs.name
      LOG_RETENTION_DAYS = tostring(var.log_retention_days)
      API_KEY            = random_password.api_key.result
    }
  }
}

resource "aws_lambda_function" "get_logs" {
  filename         = data.archive_file.backend_zip.output_path
  source_code_hash = data.archive_file.backend_zip.output_base64sha256
  function_name    = "${var.project_prefix}_get_logs"
  role             = aws_iam_role.lambda_role.arn
  handler          = "get_logs.lambda_handler"
  runtime          = "python3.12"
  timeout          = var.lambda_timeout
  memory_size      = var.lambda_memory

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.llm_logs.name
    }
  }
}

# ──────────────────────────────────────────────
# API Key (generated randomly, stored in Lambda env)
# ──────────────────────────────────────────────

resource "random_password" "api_key" {
  length  = 32
  special = false
}

# ──────────────────────────────────────────────
# API Gateway
# ──────────────────────────────────────────────

resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_prefix}_api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = var.cors_allowed_origins
    allow_methods = ["POST", "GET", "OPTIONS"]
    allow_headers = ["content-type", "authorization", "x-api-key", "x-amz-date", "x-amz-security-token"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "api_stage" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = var.api_throttle_burst
    throttling_rate_limit  = var.api_throttle_rate
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gw_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gw_logs" {
  name              = "/aws/apigateway/${var.project_prefix}_api"
  retention_in_days = 14
}

# Ingest route
resource "aws_apigatewayv2_integration" "ingest_integration" {
  api_id             = aws_apigatewayv2_api.api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.ingest.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "ingest_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /ingest"
  target    = "integrations/${aws_apigatewayv2_integration.ingest_integration.id}"
}

# Get logs route
resource "aws_apigatewayv2_integration" "get_logs_integration" {
  api_id             = aws_apigatewayv2_api.api.id
  integration_type   = "AWS_PROXY"
  integration_uri    = aws_lambda_function.get_logs.invoke_arn
  integration_method = "POST"
}

resource "aws_apigatewayv2_route" "get_logs_route" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /logs"
  target    = "integrations/${aws_apigatewayv2_integration.get_logs_integration.id}"
}

# Lambda permissions
resource "aws_lambda_permission" "api_gw_ingest" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.ingest.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "api_gw_get_logs" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_logs.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}
