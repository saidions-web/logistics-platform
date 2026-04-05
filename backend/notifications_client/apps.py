from django.apps import AppConfig


class NotificationsClientConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'notifications_client'
    verbose_name = 'Notifications Client'

    def ready(self):
        import notifications_client.signals