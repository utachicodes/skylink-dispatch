-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Update the notify function to use the correct schema
DROP TRIGGER IF EXISTS on_delivery_status_change ON public.deliveries;

CREATE OR REPLACE FUNCTION public.notify_delivery_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  function_url text;
  service_role_key text;
BEGIN
  -- Only send notification if status actually changed and client exists
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.client_id IS NOT NULL THEN
    BEGIN
      -- Get environment variables
      function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-delivery-notification';
      service_role_key := current_setting('app.settings.supabase_service_role_key', true);
      
      -- Call the edge function asynchronously using pg_net
      PERFORM extensions.http_post(
        url := function_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || service_role_key
        ),
        body := jsonb_build_object(
          'delivery_id', NEW.id::text,
          'old_status', OLD.status::text,
          'new_status', NEW.status::text
        )
      );
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't block the transaction
      RAISE WARNING 'Failed to send notification: %', SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_delivery_status_change();