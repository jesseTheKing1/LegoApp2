from rest_framework import serializers


class PresignRequestSerializer(serializers.Serializer):
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=100, required=False, allow_blank=True)


class PresignResponseSerializer(serializers.Serializer):
    upload_url = serializers.URLField()
    method = serializers.CharField()
    headers = serializers.DictField(child=serializers.CharField())
    key = serializers.CharField()
    public_url = serializers.URLField()


class R2DeleteRequestSerializer(serializers.Serializer):
    key = serializers.CharField(max_length=1024)
