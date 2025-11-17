output "site_url" {
  value = "https://${local.fqdn}"
}

output "cloudfront_domain" {
  description = "Temporary URL (use this before DNS is updated)"
  value       = aws_cloudfront_distribution.cdn.domain_name
}

output "s3_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate in us-east-1"
  value       = aws_acm_certificate.this.arn
}

output "acm_dns_validation_records" {
  description = "DNS records required for ACM validation (add to GoDaddy)"
  value = [
    for dvo in aws_acm_certificate.this.domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ]
}

output "cloudfront_distribution_id" {
  description = "ID of the CloudFront distribution"
  value       = aws_cloudfront_distribution.cdn.id
}

