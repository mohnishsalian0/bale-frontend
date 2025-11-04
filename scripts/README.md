# Production Setup Scripts

## Setup Company & Generate Invite

This script creates a new company, warehouse, and admin invite link for your production deployment.

### Prerequisites

1. Your app must be deployed and accessible at a URL
2. You need the Supabase service role key (from Supabase Dashboard → Settings → API)
3. Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

### How to Use

1. **Edit the script** (`scripts/setup-production-company.ts`)

   Open the file and edit the company and warehouse information at the top:

   ```typescript
   const COMPANY_INFO = {
     name: 'Your Company Name',
     gst_number: '27AABCT1234A1Z5',
     // ... edit all fields
   };

   const WAREHOUSE_INFO = {
     name: 'Main Warehouse',
     // ... edit all fields
   };

   const ADMIN_INVITE = {
     name: 'Admin User',
     email: 'admin@yourcompany.com',
     phone_number: '+91 9876543210',
   };
   ```

2. **Run the script**

   ```bash
   npm run setup:company
   ```

3. **Copy the invite link**

   The script will output an invite link like:
   ```
   https://your-app-domain.com/invite/abc123def456...
   ```

4. **Send the invite link** to the admin user

   They should:
   - Open the link
   - Sign in with Google
   - Accept the invite
   - They'll be automatically set up as an admin for the company

### What the Script Does

1. ✅ Creates a new company with your details
2. ✅ Creates a warehouse linked to the company
3. ✅ Generates a secure invite code (expires in 7 days)
4. ✅ Creates an invite record in the database
5. ✅ Outputs the invite URL to send to the admin

### Notes

- The invite link expires in 7 days
- The admin user must sign in with Google OAuth
- After accepting the invite, the user becomes an admin with full access
- You can run this script multiple times to create additional companies
- Each company is isolated with its own data (multi-tenant architecture)

### Troubleshooting

**Error: Missing environment variables**
- Make sure `.env.local` exists and has the required variables

**Error: Failed to create company**
- Check that your Supabase service role key is correct
- Verify the database is accessible and migrations are applied

**Invite link not working**
- Make sure `NEXT_PUBLIC_APP_URL` matches your deployed app URL
- Check that the invite code matches what's in the database
- Verify the invite hasn't expired (expires_at timestamp)
