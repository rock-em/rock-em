-- The languages map, topic and legacy columns were left in place, so only the
-- contract added here is removed. Edits made after this migration are lost.
DROP TABLE problem_starters;
DROP TABLE problem_tests;
ALTER TABLE problems DROP COLUMN signature, DROP COLUMN compare;
DROP FUNCTION valid_problem_signature(JSONB);
DROP FUNCTION valid_problem_type(TEXT);
DROP TABLE problem_topics;
DROP TABLE topics;
DROP TABLE languages;
