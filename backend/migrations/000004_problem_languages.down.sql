-- Export language data before rollback: the old schema cannot represent it.
ALTER TABLE problems DROP COLUMN languages, DROP COLUMN short_description;
DROP FUNCTION valid_problem_languages(JSONB);
