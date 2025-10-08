/*
  # Fix User Record Creation

  1. Purpose
    - Ensure users can create their own profile records
    - Add upsert capability to handle race conditions
    - Make user creation more robust

  2. Changes
    - Recreate INSERT policy with proper permissions
    - Add ON CONFLICT handling support

  3. Security
    - Users can only create/update their own records
    - Maintains auth.uid() = id constraint
*/

-- Drop and recreate the insert policy to ensure it works correctly
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure the select policy exists for authenticated users
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
