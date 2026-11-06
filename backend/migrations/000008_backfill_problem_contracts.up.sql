-- Fill the gaps 000007 left: problems with no signature offer no languages.
--
-- 1. Catalog problems whose rows predate the seed migrations. 000003 skipped
--    existing slugs, so such a row (for example a hand-made "two-sum") never got
--    a topic or language data, and 000007 had nothing to backfill from. Only
--    rows that are still empty (no signature, no tests) and carry the catalog
--    title are filled in; their own description is kept.
-- 2. Other unsigned problems that have tests. Their signature is inferred from
--    the stored test arguments, with parameter names taken from the authored
--    JavaScript or Python starter. Linked lists and trees cannot be told apart
--    from plain arrays in JSON, so they become arrays; an admin can PUT a better
--    signature later. Problems whose tests disagree are left alone and listed.

CREATE TEMP TABLE catalog_contract AS
SELECT c.*, s.signature, s.compare
FROM jsonb_to_recordset($catalog$[
 {"slug":"two-sum","title":"Two Sum","topic":"Arrays","examples":2,"constraints":["2 <= nums.length <= 10000","Exactly one valid pair exists.","You cannot use the same element twice."],"tests":[{"args":[[2,7,11,15],9],"expected":[0,1]},{"args":[[3,2,4],6],"expected":[1,2]},{"args":[[3,3],6],"expected":[0,1]}]},
 {"slug":"valid-parentheses","title":"Valid Parentheses","topic":"Stack","examples":2,"constraints":["1 <= s.length <= 10000","s contains only parentheses and brackets."],"tests":[{"args":["()[]{}"],"expected":true},{"args":["(]"],"expected":false},{"args":["{[]}"],"expected":true},{"args":["([)]"],"expected":false}]},
 {"slug":"binary-search","title":"Binary Search","topic":"Search","examples":2,"constraints":["1 <= nums.length <= 10000","nums is sorted and contains distinct integers."],"tests":[{"args":[[-1,0,3,5,9,12],9],"expected":4},{"args":[[-1,0,3,5,9,12],2],"expected":-1},{"args":[[5],5],"expected":0},{"args":[[5],-5],"expected":-1}]},
 {"slug":"merge-two-sorted-lists","title":"Merge Two Sorted Lists","topic":"Linked Lists","examples":2,"constraints":["Both lists are sorted in non-decreasing order.","The total number of nodes is at most 50."],"tests":[{"args":[[1,2,4],[1,3,4]],"expected":[1,1,2,3,4,4]},{"args":[[],[]],"expected":[]},{"args":[[],[0]],"expected":[0]}]},
 {"slug":"maximum-subarray","title":"Maximum Subarray","topic":"Arrays","examples":2,"constraints":["1 <= nums.length <= 100000","-10000 <= nums[i] <= 10000"],"tests":[{"args":[[-2,1,-3,4,-1,2,1,-5,4]],"expected":6,"explanation":"The subarray [4, -1, 2, 1] has sum 6."},{"args":[[1]],"expected":1},{"args":[[5,4,-1,7,8]],"expected":23},{"args":[[-3,-2,-5]],"expected":-2}]},
 {"slug":"number-of-islands","title":"Number of Islands","topic":"Graphs","examples":2,"constraints":["1 <= grid.length, grid[i].length <= 300","Each cell is \"0\" or \"1\"."],"tests":[{"args":[[["1","1","0"],["1","0","0"],["0","0","1"]]],"expected":2},{"args":[[["0","0"],["0","0"]]],"expected":0},{"args":[[["1","1"],["1","1"]]],"expected":1}]}
]$catalog$::jsonb) AS c(slug TEXT, title TEXT, topic TEXT, examples INT, constraints JSONB, tests JSONB)
JOIN (VALUES
 ('two-sum', '{"function":"twoSum","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}'::jsonb, 'unordered'),
 ('valid-parentheses', '{"function":"isValid","params":[{"name":"s","type":"string"}],"returns":"bool"}', 'exact'),
 ('binary-search', '{"function":"search","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int"}', 'exact'),
 ('merge-two-sorted-lists', '{"function":"mergeTwoLists","params":[{"name":"list1","type":"ListNode"},{"name":"list2","type":"ListNode"}],"returns":"ListNode"}', 'exact'),
 ('maximum-subarray', '{"function":"maxSubArray","params":[{"name":"nums","type":"int[]"}],"returns":"int"}', 'exact'),
 ('number-of-islands', '{"function":"numIslands","params":[{"name":"grid","type":"char[][]"}],"returns":"int"}', 'exact')
) AS s(slug, signature, compare) ON s.slug = c.slug;

CREATE TEMP TABLE repaired AS
SELECT p.id, c.* FROM problems p JOIN catalog_contract c ON c.slug = p.slug
WHERE p.signature IS NULL AND lower(btrim(p.title)) = lower(c.title)
 AND NOT EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = p.id);

UPDATE problems p SET signature = r.signature, compare = r.compare,
 topic = CASE WHEN p.topic = '' THEN r.topic ELSE p.topic END,
 constraints = CASE WHEN p.constraints = '[]' THEN r.constraints ELSE p.constraints END,
 updated_at = now()
FROM repaired r WHERE p.id = r.id;

INSERT INTO problem_tests(problem_id, ordinal, kind, args, expected, explanation)
SELECT r.id, t.ord - 1, CASE WHEN t.ord <= r.examples THEN 'example' ELSE 'public' END,
 t.test->'args', t.test->'expected', CASE WHEN t.ord <= r.examples THEN t.test->>'explanation' END
FROM repaired r, jsonb_array_elements(r.tests) WITH ORDINALITY AS t(test, ord);

-- Shared topics are matched by slug, as the API does.
INSERT INTO topics(slug, name, sort_order)
SELECT DISTINCT ON (slug) slug, topic, (SELECT coalesce(max(sort_order), 0) + 1 FROM topics)
FROM (SELECT trim(both '-' FROM regexp_replace(lower(topic), '[^a-z0-9]+', '-', 'g')) AS slug, topic FROM repaired) r
ON CONFLICT (slug) DO NOTHING;
INSERT INTO problem_topics(problem_id, topic_id, is_primary)
SELECT r.id, t.id, NOT EXISTS (SELECT 1 FROM problem_topics pt WHERE pt.problem_id = r.id AND pt.is_primary)
FROM repaired r JOIN topics t ON t.slug = trim(both '-' FROM regexp_replace(lower(r.topic), '[^a-z0-9]+', '-', 'g'))
ON CONFLICT DO NOTHING;

-- Type inference. '?' is a type not yet known (null, or an empty array's element).
CREATE FUNCTION contract_merge_type(a TEXT, b TEXT) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE inner_type TEXT;
BEGIN
 IF a IS NULL OR a = '?' THEN RETURN b; END IF;
 IF b IS NULL OR b = '?' OR a = b THEN RETURN a; END IF;
 IF a LIKE '%[]' AND b LIKE '%[]' THEN
  inner_type := contract_merge_type(left(a, -2), left(b, -2));
  RETURN CASE WHEN inner_type = 'conflict' THEN 'conflict' ELSE inner_type || '[]' END;
 END IF;
 IF a IN ('int', 'long', 'double') AND b IN ('int', 'long', 'double') THEN
  RETURN CASE WHEN 'double' IN (a, b) THEN 'double' ELSE 'long' END;
 END IF;
 RETURN 'conflict';
END;
$$;
CREATE FUNCTION contract_value_type(v JSONB) RETURNS TEXT
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE element JSONB; result TEXT := '?';
BEGIN
 CASE jsonb_typeof(v)
  WHEN 'boolean' THEN RETURN 'bool';
  WHEN 'string' THEN RETURN 'string';
  WHEN 'number' THEN
   IF v::text !~ '^-?[0-9]+$' THEN RETURN 'double'; END IF;
   RETURN CASE WHEN v::numeric BETWEEN -2147483648 AND 2147483647 THEN 'int' ELSE 'long' END;
  WHEN 'array' THEN
   FOR element IN SELECT * FROM jsonb_array_elements(v) LOOP
    result := contract_merge_type(result, contract_value_type(element));
    IF result = 'conflict' THEN RETURN result; END IF;
   END LOOP;
   RETURN result || '[]';
  WHEN 'null' THEN RETURN '?';
  ELSE RETURN 'conflict';
 END CASE;
END;
$$;
-- Parameter list of the first function in a starter, without defaults or type hints.
CREATE FUNCTION contract_starter_params(starter TEXT) RETURNS TEXT[]
LANGUAGE sql IMMUTABLE AS $$
 SELECT array_remove(array_agg(regexp_replace(btrim(part), '^\**([A-Za-z_][A-Za-z0-9_]*).*$', '\1') ORDER BY n), 'self')
 FROM regexp_split_to_table(
  coalesce(substring(starter FROM '(?:function\s+[A-Za-z_$][A-Za-z0-9_$]*|def\s+[A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)'), ''), ','
 ) WITH ORDINALITY AS s(part, n)
 WHERE btrim(part) <> ''
$$;

DO $$
DECLARE
 p RECORD; tc RECORD; arg_types TEXT[]; return_type TEXT; arg_count INT; names TEXT[];
 fn TEXT; params JSONB; inferred JSONB; skipped TEXT[] := '{}';
BEGIN
 FOR p IN SELECT id, slug, languages, function_name, starter FROM problems
  WHERE signature IS NULL AND EXISTS (SELECT 1 FROM problem_tests t WHERE t.problem_id = problems.id)
  ORDER BY id
 LOOP
  arg_types := NULL; return_type := NULL; arg_count := NULL;
  FOR tc IN SELECT args, expected FROM problem_tests WHERE problem_id = p.id ORDER BY ordinal LOOP
   IF arg_count IS NULL THEN
    arg_count := jsonb_array_length(tc.args);
    arg_types := array_fill('?'::TEXT, ARRAY[arg_count]);
   ELSIF jsonb_array_length(tc.args) <> arg_count THEN
    arg_count := -1; EXIT;
   END IF;
   FOR i IN 1..arg_count LOOP
    arg_types[i] := contract_merge_type(arg_types[i], contract_value_type(tc.args->(i - 1)));
   END LOOP;
   return_type := contract_merge_type(return_type, contract_value_type(tc.expected));
  END LOOP;

  fn := coalesce(nullif(p.languages->'javascript'->>'functionName', ''), nullif(p.function_name, ''),
   nullif(p.languages->'python'->>'functionName', ''));
  names := coalesce(contract_starter_params(p.languages->'javascript'->>'starter'), contract_starter_params(p.starter));
  IF coalesce(cardinality(names), 0) <> arg_count THEN
   names := contract_starter_params(p.languages->'python'->>'starter');
  END IF;
  IF arg_count > 0 AND coalesce(cardinality(names), 0) <> arg_count THEN
   SELECT array_agg('arg' || i) INTO names FROM generate_series(1, arg_count) i;
  END IF;

  params := '[]';
  FOR i IN 1..greatest(arg_count, 0) LOOP
   params := params || jsonb_build_object('name', names[i], 'type', arg_types[i]);
  END LOOP;
  inferred := jsonb_build_object('function', fn, 'params', params, 'returns', return_type);
  IF arg_count < 0 OR fn IS NULL OR NOT valid_problem_signature(inferred) THEN
   skipped := skipped || p.slug;
   CONTINUE;
  END IF;
  UPDATE problems SET signature = inferred, updated_at = now() WHERE id = p.id;
 END LOOP;
 IF cardinality(skipped) > 0 THEN
  RAISE NOTICE 'No signature inferred for: % (PUT one through the admin API)', array_to_string(skipped, ', ');
 END IF;
END;
$$;

DROP FUNCTION contract_starter_params(TEXT);
DROP FUNCTION contract_value_type(JSONB);
DROP FUNCTION contract_merge_type(TEXT, TEXT);
DROP TABLE repaired;
DROP TABLE catalog_contract;
