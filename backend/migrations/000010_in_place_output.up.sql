-- Problems that change an argument instead of returning a value, like "merge
-- nums2 into nums1" or "remove val from nums and return the new length k".
-- signature.output names the argument the runner checks after the call:
--  * returns "void": the whole argument is the answer
--  * returns "int": the first k items of the argument are the answer
-- Parameters can't be void, so void only shows up as a return type.
CREATE OR REPLACE FUNCTION valid_problem_signature(s JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE param JSONB; names TEXT[] := '{}'; output_type TEXT;
BEGIN
 IF jsonb_typeof(s) IS DISTINCT FROM 'object'
    OR jsonb_typeof(s->'function') IS DISTINCT FROM 'string'
    OR jsonb_typeof(s->'params') IS DISTINCT FROM 'array'
    OR jsonb_typeof(s->'returns') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 IF (s->>'function') !~ '^[A-Za-z_][A-Za-z0-9_]{0,63}$'
    OR NOT (valid_problem_type(s->>'returns') OR s->>'returns' = 'void')
    OR jsonb_array_length(s->'params') > 10 THEN RETURN false; END IF;
 FOR param IN SELECT * FROM jsonb_array_elements(s->'params') LOOP
  IF jsonb_typeof(param) IS DISTINCT FROM 'object'
     OR coalesce(param->>'name', '') !~ '^[A-Za-z_][A-Za-z0-9_]{0,63}$'
     OR NOT valid_problem_type(coalesce(param->>'type', ''))
     OR (param->>'name') = ANY(names) THEN RETURN false; END IF;
  names := names || (param->>'name');
  IF param->>'name' = s->>'output' THEN output_type := param->>'type'; END IF;
 END LOOP;
 IF NOT (s ? 'output') THEN RETURN s->>'returns' <> 'void'; END IF;
 IF jsonb_typeof(s->'output') IS DISTINCT FROM 'string' OR output_type IS NULL THEN RETURN false; END IF;
 RETURN s->>'returns' = 'void' OR (s->>'returns' = 'int' AND output_type LIKE '%[]');
END;
$$;
