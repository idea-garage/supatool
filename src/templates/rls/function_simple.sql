CREATE FUNCTION ${functionName}() RETURNS text AS $$
BEGIN
  RETURN (SELECT r.name FROM user_roles ur JOIN m_roles r ON ur.role_id = r.id WHERE ur.user_id = ${userIdExpr} LIMIT 1);
END;
$$ LANGUAGE plpgsql;