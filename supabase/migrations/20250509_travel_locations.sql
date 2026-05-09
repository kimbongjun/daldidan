CREATE TABLE IF NOT EXISTS travel_locations (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  country     TEXT NOT NULL,
  city        TEXT NOT NULL,
  lat         DOUBLE PRECISION NOT NULL,
  lng         DOUBLE PRECISION NOT NULL,
  travel_date DATE NOT NULL,
  photo_url   TEXT,
  note        TEXT,
  continent   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS travel_locations_user_id_idx ON travel_locations(user_id);
CREATE INDEX IF NOT EXISTS travel_locations_travel_date_idx ON travel_locations(travel_date);

ALTER TABLE travel_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "travel_select" ON travel_locations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "travel_insert" ON travel_locations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "travel_update" ON travel_locations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "travel_delete" ON travel_locations FOR DELETE USING (auth.uid() = user_id);
