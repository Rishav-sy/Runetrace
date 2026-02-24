variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "project_prefix" {
  description = "Prefix for all resource names"
  type        = string
  default     = "runetrace"
}

variable "table_name" {
  description = "DynamoDB table name"
  type        = string
  default     = "LLMLogs"
}

variable "lambda_memory" {
  description = "Lambda function memory in MB"
  type        = number
  default     = 128
}

variable "lambda_timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 3
}

variable "cors_allowed_origins" {
  description = "CORS allowed origins"
  type        = list(string)
  default     = ["*"]
}

variable "api_throttle_rate" {
  description = "API Gateway throttle rate limit (requests/second)"
  type        = number
  default     = 10
}

variable "api_throttle_burst" {
  description = "API Gateway throttle burst limit"
  type        = number
  default     = 10
}

variable "log_retention_days" {
  description = "Number of days to retain logs in DynamoDB (TTL)"
  type        = number
  default     = 90
}
