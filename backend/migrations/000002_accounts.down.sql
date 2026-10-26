DROP TABLE user_problems;
ALTER TABLE problems DROP COLUMN topic, DROP COLUMN examples, DROP COLUMN constraints,
 DROP COLUMN starter, DROP COLUMN function_name, DROP COLUMN created_by, DROP COLUMN deleted_at;
DROP TABLE sessions;
DROP TABLE users;
