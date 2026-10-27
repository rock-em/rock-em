-- Entries are supported language data, never flags or empty placeholders.
CREATE FUNCTION valid_problem_languages(data JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE lang TEXT; value JSONB; test JSONB;
BEGIN
 IF jsonb_typeof(data) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
 FOR lang,value IN SELECT * FROM jsonb_each(data) LOOP
  IF lang !~ '^[a-z][a-z0-9_+-]{0,31}$' OR jsonb_typeof(value) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
  IF jsonb_typeof(value->'starter') IS DISTINCT FROM 'string'
     OR jsonb_typeof(value->'functionName') IS DISTINCT FROM 'string'
     OR jsonb_typeof(value->'indexBase') IS DISTINCT FROM 'number' THEN RETURN false; END IF;
  IF btrim(value->>'starter')='' OR btrim(value->>'functionName')='' OR (value->>'indexBase') !~ '^[0-9]+$' THEN RETURN false; END IF;
  IF jsonb_typeof(value->'requirements') IS DISTINCT FROM 'array'
     OR jsonb_typeof(value->'examples') IS DISTINCT FROM 'array'
     OR jsonb_typeof(value->'constraints') IS DISTINCT FROM 'array'
     OR jsonb_typeof(value->'tests') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(value->'tests')=0 THEN RETURN false; END IF;
  FOR test IN SELECT * FROM jsonb_array_elements(value->'tests') LOOP
   IF jsonb_typeof(test) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
   IF jsonb_typeof(test->'input') IS DISTINCT FROM 'array' OR NOT (test ? 'expected') THEN RETURN false; END IF;
  END LOOP;
 END LOOP;
 RETURN true;
END;
$$;
-- Language keys and their complete public practice data live on the problem.
-- Legacy columns are retained for rollback; unknown/custom content is not guessed.
ALTER TABLE problems
 ADD COLUMN short_description TEXT NOT NULL DEFAULT '',
 ADD COLUMN languages JSONB NOT NULL DEFAULT '{}' CHECK (valid_problem_languages(languages));
UPDATE problems SET short_description = left(description, 200);
