const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // A user's JWT is passed in the context object.
  const { user } = context.clientContext;

  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data, error } = await supabaseAdmin.auth.admin.deleteUser(user.sub);

  if (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: `Error deleting user: ${error.message}` }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'User deleted successfully' }),
  };
};