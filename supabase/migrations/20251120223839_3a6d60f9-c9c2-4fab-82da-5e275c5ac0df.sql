-- Fix search path for notify_delivery_status_change function
CREATE OR REPLACE FUNCTION notify_delivery_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  function_url text;
  service_role_key text;
BEGIN
  -- Only send notification if status actually changed and client exists
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.client_id IS NOT NULL THEN
    -- Get environment variables (these will be available in production)
    function_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-delivery-notification';
    service_role_key := current_setting('app.settings.supabase_service_role_key', true);
    
    -- Call the edge function asynchronously using pg_net
    PERFORM
      net.http_post(
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
  END IF;
  
  RETURN NEW;
END;
$$;