-- One language-agnostic contract per problem: a typed signature plus JSON tests.
-- Each language runner converts JSON values into native types, so per-language
-- data shrinks to the runtime registry and optional starter overrides. The old
-- languages map, topic and legacy columns stay readable until a later migration
-- drops them; rollback of this migration loses nothing.

-- Keys double as editor language ids (CodeMirror lang-* packages). Starters are
-- plain text indented with indent_unit, matching the editor's indentUnit.
CREATE TABLE languages (
 key TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_+-]{0,31}$'),
 name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
 version TEXT NOT NULL,
 indent_unit TEXT NOT NULL CHECK (indent_unit ~ '^( {1,8}|\t)$'),
 enabled BOOLEAN NOT NULL DEFAULT true
);
INSERT INTO languages(key, name, version, indent_unit) VALUES
 ('javascript', 'JavaScript', 'ES2022', '  '),
 ('python', 'Python', '3.10', '    ');

CREATE TABLE topics (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
 sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE problem_topics (
 problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
 topic_id BIGINT NOT NULL REFERENCES topics(id),
 is_primary BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY (problem_id, topic_id)
);
CREATE UNIQUE INDEX problem_topics_one_primary ON problem_topics(problem_id) WHERE is_primary;
CREATE INDEX problem_topics_topic_idx ON problem_topics(topic_id);

-- Types are a fixed vocabulary every runner implements. ListNode travels as an
-- array of values, TreeNode as a level-order array with nulls.
CREATE FUNCTION valid_problem_type(t TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $$
 SELECT t ~ '^(int|long|double|bool|string|char|ListNode|TreeNode)(\[\]){0,3}$'
$$;
CREATE FUNCTION valid_problem_signature(s JSONB) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE param JSONB; names TEXT[] := '{}';
BEGIN
 IF jsonb_typeof(s) IS DISTINCT FROM 'object'
    OR jsonb_typeof(s->'function') IS DISTINCT FROM 'string'
    OR jsonb_typeof(s->'params') IS DISTINCT FROM 'array'
    OR jsonb_typeof(s->'returns') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 IF (s->>'function') !~ '^[A-Za-z_][A-Za-z0-9_]{0,63}$' OR NOT valid_problem_type(s->>'returns')
    OR jsonb_array_length(s->'params') > 10 THEN RETURN false; END IF;
 FOR param IN SELECT * FROM jsonb_array_elements(s->'params') LOOP
  IF jsonb_typeof(param) IS DISTINCT FROM 'object'
     OR coalesce(param->>'name', '') !~ '^[A-Za-z_][A-Za-z0-9_]{0,63}$'
     OR NOT valid_problem_type(coalesce(param->>'type', ''))
     OR (param->>'name') = ANY(names) THEN RETURN false; END IF;
  names := names || (param->>'name');
 END LOOP;
 RETURN true;
END;
$$;
ALTER TABLE problems
 ADD COLUMN signature JSONB CHECK (signature IS NULL OR valid_problem_signature(signature)),
 ADD COLUMN compare TEXT NOT NULL DEFAULT 'exact' CHECK (compare IN ('exact', 'unordered'));

-- Examples are tests shown in the statement; hidden tests never leave the API.
CREATE TABLE problem_tests (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
 ordinal INT NOT NULL CHECK (ordinal >= 0),
 kind TEXT NOT NULL CHECK (kind IN ('example', 'public', 'hidden')),
 args JSONB NOT NULL CHECK (jsonb_typeof(args) = 'array'),
 expected JSONB NOT NULL,
 explanation TEXT CHECK (explanation IS NULL OR kind = 'example'),
 UNIQUE (problem_id, ordinal)
);

-- Only when the starter generated from the signature is not good enough.
CREATE TABLE problem_starters (
 problem_id BIGINT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
 language TEXT NOT NULL REFERENCES languages(key),
 code TEXT NOT NULL CHECK (btrim(code) <> ''),
 PRIMARY KEY (problem_id, language)
);

-- Backfill topics from the single topic column, in first-seen order.
INSERT INTO topics(slug, name, sort_order)
SELECT slug, min(topic), row_number() OVER (ORDER BY min(id))
FROM (
 SELECT id, topic, trim(both '-' FROM regexp_replace(lower(topic), '[^a-z0-9]+', '-', 'g')) AS slug
 FROM problems
) p
WHERE slug <> ''
GROUP BY slug;
INSERT INTO problem_topics(problem_id, topic_id, is_primary)
SELECT p.id, t.id, true FROM problems p
JOIN topics t ON t.slug = trim(both '-' FROM regexp_replace(lower(p.topic), '[^a-z0-9]+', '-', 'g'));

-- Tests and examples are the same in every authored language, so copy them from
-- one variant (JavaScript, then Python, then any). Authored examples have always
-- been the leading tests, so the first N tests become the N examples.
WITH source AS (
 SELECT p.id, coalesce(p.languages->'javascript', p.languages->'python',
  (SELECT value FROM jsonb_each(p.languages) ORDER BY key LIMIT 1)) AS v
 FROM problems p WHERE p.languages <> '{}'
)
INSERT INTO problem_tests(problem_id, ordinal, kind, args, expected, explanation)
SELECT s.id, t.ord - 1,
 CASE WHEN t.ord <= jsonb_array_length(s.v->'examples') THEN 'example' ELSE 'public' END,
 t.test->'input', t.test->'expected',
 CASE WHEN t.ord <= jsonb_array_length(s.v->'examples') THEN nullif(s.v->'examples'->(t.ord::int - 1)->>'explanation', '') END
FROM source s, jsonb_array_elements(s.v->'tests') WITH ORDINALITY AS t(test, ord);

-- Constraints are shared; keep the original wording where it exists.
UPDATE problems p SET constraints = coalesce(p.languages->'javascript'->'constraints', p.languages->'python'->'constraints', '[]')
WHERE p.constraints = '[]' AND p.languages <> '{}';

-- Signatures for the starter catalog, only while its JavaScript entry still uses
-- the seeded function name. Admin-authored problems need a signature before
-- languages are offered for them again.
UPDATE problems p SET signature = s.signature, compare = s.compare
FROM (VALUES
 ('two-sum', 'twoSum', '{"function":"twoSum","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int[]"}'::jsonb, 'unordered'),
 ('valid-parentheses', 'isValid', '{"function":"isValid","params":[{"name":"s","type":"string"}],"returns":"bool"}', 'exact'),
 ('binary-search', 'search', '{"function":"search","params":[{"name":"nums","type":"int[]"},{"name":"target","type":"int"}],"returns":"int"}', 'exact'),
 ('merge-two-sorted-lists', 'mergeTwoLists', '{"function":"mergeTwoLists","params":[{"name":"list1","type":"ListNode"},{"name":"list2","type":"ListNode"}],"returns":"ListNode"}', 'exact'),
 ('maximum-subarray', 'maxSubArray', '{"function":"maxSubArray","params":[{"name":"nums","type":"int[]"}],"returns":"int"}', 'exact'),
 ('number-of-islands', 'numIslands', '{"function":"numIslands","params":[{"name":"grid","type":"char[][]"}],"returns":"int"}', 'exact')
) AS s(slug, js_name, signature, compare)
WHERE p.slug = s.slug AND p.signature IS NULL AND p.languages->'javascript'->>'functionName' = s.js_name;
