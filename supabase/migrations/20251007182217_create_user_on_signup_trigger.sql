/*
  # Create User Record Automatically on Signup

  1. Purpose
    - Automatically creates a user record in the public.users table when a new user signs up
    - Eliminates the need for manual user record creation in application code
    - Prevents foreign key constraint violations when inserting jobs

  2. Changes
    - Add trigger function to handle new user creation
    - Add trigger on auth.users to execute function on INSERT
    - Function safely handles existing records (upsert pattern)

  3. Security
    - Trigger runs with elevated privileges (SECURITY DEFINER)
    - Only executes on new user signup in auth.users table
*/

-- Create trigger function to automatically create user record
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
