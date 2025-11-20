-- Update RLS policies to give admins full access to all tables

-- Admins can do everything with assignments
CREATE POLICY "Admins can do everything with assignments"
ON public.assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can do everything with evaluations
CREATE POLICY "Admins can do everything with evaluations"
ON public.evaluations
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can do everything with submissions
CREATE POLICY "Admins can do everything with submissions"
ON public.submissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can do everything with user_roles
CREATE POLICY "Admins can do everything with user_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can do everything with profiles
CREATE POLICY "Admins can do everything with profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));