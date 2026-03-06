"""Task serializers."""
from rest_framework import serializers
from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    username = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = Task
        fields = (
            'id', 'user', 'user_email', 'username',
            'title', 'description', 'status', 'priority',
            'due_date', 'tags', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'user', 'user_email', 'username', 'created_at', 'updated_at')

    def validate_title(self, value):
        value = value.strip()
        if len(value) < 3:
            raise serializers.ValidationError("Title must be at least 3 characters.")
        return value

    def validate_tags(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Tags must be a list of strings.")
        if len(value) > 10:
            raise serializers.ValidationError("You can add at most 10 tags.")
        sanitized = [str(tag).strip()[:30] for tag in value]
        return sanitized


class TaskCreateSerializer(TaskSerializer):
    """Used for create — all writable fields."""
    class Meta(TaskSerializer.Meta):
        pass

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
