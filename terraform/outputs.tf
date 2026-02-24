output "api_url" {
  description = "API Gateway invoke URL"
  value       = aws_apigatewayv2_stage.api_stage.invoke_url
}

output "api_key" {
  description = "API key for authenticating ingest requests (pass as x-api-key header)"
  value       = random_password.api_key.result
  sensitive   = true
}

output "dynamodb_table_name" {
  description = "DynamoDB table name"
  value       = aws_dynamodb_table.llm_logs.name
}

output "ingest_lambda_arn" {
  description = "Ingest Lambda function ARN"
  value       = aws_lambda_function.ingest.arn
}

output "get_logs_lambda_arn" {
  description = "GetLogs Lambda function ARN"
  value       = aws_lambda_function.get_logs.arn
}
