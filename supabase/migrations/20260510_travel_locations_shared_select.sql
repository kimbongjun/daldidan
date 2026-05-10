DROP POLICY IF EXISTS "travel_select" ON travel_locations;
DROP POLICY IF EXISTS "travel_update" ON travel_locations;
DROP POLICY IF EXISTS "travel_delete" ON travel_locations;

CREATE POLICY "travel_select_all_authenticated"
ON travel_locations
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "travel_update_all_authenticated"
ON travel_locations
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "travel_delete_all_authenticated"
ON travel_locations
FOR DELETE
USING (auth.uid() IS NOT NULL);
