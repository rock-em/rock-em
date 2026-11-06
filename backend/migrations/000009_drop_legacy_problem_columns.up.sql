-- The contract tables from 000007 are the only source of problem data now, and
-- the API no longer reads or writes these columns. Run this only after the API
-- that reads the category from problem_topics is deployed: older binaries
-- still select `topic`. The per-language map is dropped, so rolling this back
-- restores empty columns, not the authored per-language content.
ALTER TABLE problems
 DROP COLUMN languages,
 DROP COLUMN topic,
 DROP COLUMN examples,
 DROP COLUMN starter,
 DROP COLUMN function_name;
DROP FUNCTION valid_problem_languages(JSONB);
