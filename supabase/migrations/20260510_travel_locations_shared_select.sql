DROP POLICY IF EXISTS "travel_select" ON travel_locations;

CREATE POLICY "travel_select_all_authenticated"
ON travel_locations
FOR SELECT
USING (auth.uid() IS NOT NULL);
