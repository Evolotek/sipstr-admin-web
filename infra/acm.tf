# ACM Certificate (must be in us-east-1 for CloudFront)
resource "aws_acm_certificate" "this" {
  provider          = aws.us_east_1
  domain_name       = local.fqdn
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.tags
}

# ACM Certificate Validation (waits until DNS is correct)
resource "aws_acm_certificate_validation" "this" {
  provider        = aws.us_east_1
  certificate_arn = aws_acm_certificate.this.arn

  validation_record_fqdns = [
    for dvo in aws_acm_certificate.this.domain_validation_options :
    dvo.resource_record_name
  ]
}

