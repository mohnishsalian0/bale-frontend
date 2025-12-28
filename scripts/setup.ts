import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// Parse command line argument for environment
const args = process.argv.slice(2);
const env = args[0] || "local";

if (!["local", "staging"].includes(env)) {
  console.error(
    "❌ Invalid environment. Use: npx tsx scripts/test-setup.ts [local|staging]",
  );
  process.exit(1);
}

// Select credentials based on environment
let supabaseUrl: string;
let supabaseServiceKey: string;
let appUrl: string;

if (env === "staging") {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PROD!;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD!;
  appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing staging environment variables!");
    console.error("Make sure these are set in .env.local:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL_PROD");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY_PROD");
    process.exit(1);
  }
} else {
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  appUrl = "http://localhost:3000";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing local environment variables!");
    console.error("Make sure these are set in .env.local:");
    console.error("  - NEXT_PUBLIC_SUPABASE_URL");
    console.error("  - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
}

console.log(`🔧 Environment: ${env.toUpperCase()}`);
console.log(`🔗 Supabase URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestPartners() {
  console.log("🌱 Creating test data...\n");

  // Get or create company
  let companyId: string;
  let companyName: string;
  let companySlug: string;
  let warehouseId: string;
  let userId: string;

  const { data: companies, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug")
    .limit(1);

  if (companyError) {
    console.error("❌ Error fetching companies:", companyError);
    return;
  }

  if (!companies || companies.length === 0) {
    console.log("📦 Creating test company...");
    const { data: newCompany, error: createError } = await supabase
      .from("companies")
      .insert({
        name: "Bale Test Company",
        gst_number: "27AABCT1234A1Z5",
        pan_number: "AABCT1234A",
        business_type: "Textile Manufacturing",
        address_line1: "123 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pin_code: "400001",
      })
      .select()
      .single();

    if (createError || !newCompany) {
      console.error("❌ Failed to create company:", createError);
      return;
    }

    companyId = newCompany.id;
    companyName = newCompany.name;
    companySlug = newCompany.slug;
    console.log(`✅ Created company: ${companyId}\n`);

    // Create a test warehouse
    console.log("🏭 Creating test warehouse...");
    const { data: warehouse, error: warehouseError } = await supabase
      .from("warehouses")
      .insert({
        company_id: companyId,
        name: "Main Warehouse",
        address_line1: "123 Test Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        pin_code: "400001",
      })
      .select()
      .single();

    if (warehouseError || !warehouse) {
      console.error("❌ Failed to create warehouse:", warehouseError);
      return;
    }

    warehouseId = warehouse.id;
    console.log(`✅ Created warehouse: ${warehouseId}\n`);

    // Create catalog configuration
    console.log("🏪 Creating catalog configuration...");
    const { data: catalogConfig, error: catalogError } = await supabase
      .from("catalog_configurations")
      .insert({
        company_id: companyId,
        accepting_orders: true,
        catalog_name: "Bale Test Store",
        contact_phone: "+91 98765 43210",
        contact_email: "contact@baletest.com",
        contact_address: "123 Test Street, Mumbai, Maharashtra, 400001",
        terms_conditions: "Standard terms and conditions apply.",
        return_policy: "Returns accepted within 7 days of delivery.",
        privacy_policy: "We respect your privacy and protect your data.",
      })
      .select()
      .single();

    if (catalogError || !catalogConfig) {
      console.error("❌ Failed to create catalog configuration:", catalogError);
    } else {
      console.log(`✅ Created catalog configuration\n`);
    }

    // Create a test admin user
    console.log("👤 Creating test admin user...");
    const { data: authUser, error: authError } =
      await supabase.auth.admin.createUser({
        email: "admin@baletest.com",
        password: "testpassword123",
        email_confirm: true,
      });

    if (authError || !authUser.user) {
      console.error("❌ Failed to create auth user:", authError);
      return;
    } else {
      const { data: user, error: userError } = await supabase
        .from("users")
        .insert({
          auth_user_id: authUser.user.id,
          company_id: companyId,
          warehouse_id: warehouse.id,
          first_name: "Admin",
          last_name: "User",
          email: "admin@baletest.com",
          role: "admin",
          all_warehouses_access: true,
        })
        .select()
        .single();

      if (userError || !user) {
        console.error("❌ Failed to create user profile:", userError);
        return;
      } else {
        userId = user.id;
        console.log(`✅ Created admin user: ${user.id}\n`);
      }
    }
  } else {
    companyId = companies[0].id;
    companyName = companies[0].name;
    companySlug = companies[0].slug;
    console.log(`📦 Using existing company: ${companyId}\n`);

    // Get existing warehouse
    const { data: warehouses, error: whError } = await supabase
      .from("warehouses")
      .select("id, name")
      .eq("company_id", companyId)
      .limit(1);

    if (whError || !warehouses || warehouses.length === 0) {
      console.error("❌ No warehouse found for company");
      return;
    }

    warehouseId = warehouses[0].id;

    // Get existing user
    const { data: existingUsers, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("company_id", companyId)
      .limit(1);

    if (userError || !existingUsers || existingUsers.length === 0) {
      console.error("❌ No user found for company");
      return;
    }

    userId = existingUsers[0].id;
  }

  const testPartners = [
    // Customers
    {
      company_id: companyId,
      partner_type: "customer",
      first_name: "Rajesh",
      last_name: "Kumar",
      company_name: "Kumar Textiles",
      phone_number: "+91 98765 43210",
      email: "rajesh@kumartextiles.com",
      address_line1: "123 MG Road",
      city: "Mumbai",
      state: "Maharashtra",
      pin_code: "400001",
      credit_limit_enabled: true,
      credit_limit: 100000,
    },
    {
      company_id: companyId,
      partner_type: "customer",
      first_name: "Priya",
      last_name: "Sharma",
      company_name: "Sharma Fabrics",
      phone_number: "+91 98765 43211",
      email: "priya@sharmafabrics.com",
      address_line1: "456 Commercial Street",
      city: "Bangalore",
      state: "Karnataka",
      pin_code: "560001",
      credit_limit_enabled: true,
      credit_limit: 75000,
    },
    {
      company_id: companyId,
      partner_type: "customer",
      first_name: "Amit",
      last_name: "Patel",
      company_name: "Patel Traders",
      phone_number: "+91 98765 43212",
      address_line1: "789 Ashram Road",
      city: "Ahmedabad",
      state: "Gujarat",
      pin_code: "380009",
      credit_limit_enabled: false,
      credit_limit: 0,
    },
    // Suppliers
    {
      company_id: companyId,
      partner_type: "supplier",
      first_name: "Suresh",
      last_name: "Reddy",
      company_name: "Reddy Cotton Mills",
      phone_number: "+91 98765 43213",
      email: "suresh@reddycotton.com",
      address_line1: "321 Industrial Area",
      city: "Coimbatore",
      state: "Tamil Nadu",
      pin_code: "641001",
      credit_limit_enabled: true,
      credit_limit: 200000,
    },
    {
      company_id: companyId,
      partner_type: "supplier",
      first_name: "Lakshmi",
      last_name: "Naidu",
      company_name: "Naidu Silk House",
      phone_number: "+91 98765 43214",
      address_line1: "654 Silk Market",
      city: "Kanchipuram",
      state: "Tamil Nadu",
      pin_code: "631502",
      credit_limit_enabled: true,
      credit_limit: 150000,
    },
    // Vendors
    {
      company_id: companyId,
      partner_type: "vendor",
      first_name: "Arjun",
      last_name: "singh",
      company_name: "Singh Processing Unit",
      phone_number: "+91 98765 43215",
      email: "arjun@singhprocessing.com",
      address_line1: "987 Factory Lane",
      city: "Ludhiana",
      state: "Punjab",
      pin_code: "141001",
      credit_limit_enabled: false,
      credit_limit: 0,
    },
    {
      company_id: companyId,
      partner_type: "vendor",
      first_name: "Meera",
      last_name: "Desai",
      company_name: "Desai Dyeing Works",
      phone_number: "+91 98765 43216",
      address_line1: "147 Textile Park",
      city: "Surat",
      state: "Gujarat",
      pin_code: "395003",
      credit_limit_enabled: true,
      credit_limit: 80000,
    },
    // Agents
    {
      company_id: companyId,
      partner_type: "agent",
      first_name: "Vikram",
      last_name: "Mehta",
      company_name: "Mehta Logistics",
      phone_number: "+91 98765 43217",
      email: "vikram.mehta@example.com",
      address_line1: "258 Transport Nagar",
      city: "Delhi",
      state: "Delhi",
      pin_code: "110001",
      credit_limit_enabled: false,
      credit_limit: 0,
    },
    {
      company_id: companyId,
      partner_type: "agent",
      first_name: "Anjali",
      last_name: "Gupta",
      company_name: "Gupta & Associates",
      phone_number: "+91 98765 43218",
      address_line1: "369 Market Road",
      city: "Pune",
      state: "Maharashtra",
      pin_code: "411001",
      credit_limit_enabled: false,
      credit_limit: 0,
    },
  ];

  for (const partner of testPartners) {
    const { error } = await supabase
      .from("partners")
      .insert({
        ...partner,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error(
        `❌ Failed to create partner: ${partner.first_name} ${partner.last_name}`,
      );
      console.error(`   Error: ${error.message}`);
    } else {
      console.log(
        `✅ Created ${partner.partner_type}: ${partner.first_name} ${partner.last_name} ${
          partner.company_name ? `(${partner.company_name})` : ""
        }`,
      );
    }
  }

  console.log("\n✨ Test partners created successfully!");

  // Create test products with attributes
  console.log("\n📦 Creating test products with attributes...\n");

  // First, create materials
  const materialNames = [
    "Silk",
    "Cotton",
    "Wool",
    "Polyester",
    "Linen",
    "Denim",
  ];
  const materialIds: Record<string, string> = {};

  console.log("Creating materials...");
  for (const name of materialNames) {
    const { data, error } = await supabase
      .from("product_attributes")
      .upsert(
        { company_id: companyId, name, group_name: "material" },
        { onConflict: "company_id,name" },
      )
      .select()
      .single();

    if (error) {
      console.error(
        `   ❌ Failed to create material: ${name} - ${error.message}`,
      );
    } else {
      materialIds[name] = data.id;
      console.log(`   ✅ Material: ${name}`);
    }
  }

  // Create colors
  const colorNames = ["Red", "White", "Black", "Blue", "Green", "Yellow"];
  const colorIds: Record<string, string> = {};

  console.log("Creating colors...");
  for (const name of colorNames) {
    const { data, error } = await supabase
      .from("product_attributes")
      .upsert(
        { company_id: companyId, name, group_name: "color" },
        { onConflict: "company_id,name" },
      )
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to create color: ${name} - ${error.message}`);
    } else {
      colorIds[name] = data.id;
      console.log(`   ✅ Color: ${name}`);
    }
  }

  // Create tags
  const tagNames = [
    "premium",
    "wedding",
    "traditional",
    "summer",
    "breathable",
    "casual",
    "winter",
    "warm",
    "modern",
    "formal",
    "wrinkle-free",
    "eco-friendly",
    "designer",
    "luxury",
    "festive",
    "denim",
    "durable",
    "printed",
    "colorful",
  ];
  const tagIds: Record<string, string> = {};

  console.log("Creating tags...");
  for (const name of tagNames) {
    const { data, error } = await supabase
      .from("product_attributes")
      .upsert(
        { company_id: companyId, name, group_name: "tag" },
        { onConflict: "company_id,name" },
      )
      .select()
      .single();

    if (error) {
      console.error(`   ❌ Failed to create tag: ${name} - ${error.message}`);
    } else {
      tagIds[name] = data.id;
      console.log(`   ✅ Tag: ${name}`);
    }
  }

  // Define products with their attribute references
  const testProducts = [
    {
      product: {
        company_id: companyId,
        name: "Premium Silk Saree",
        gsm: 120,
        thread_count_cm: 80,
        stock_type: "roll",
        measuring_unit: "metre",
        cost_price_per_unit: 2500.0,
        selling_price_per_unit: 3500.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 10,
        hsn_code: "5007",
        tax_type: "gst",
        gst_rate: 5,
        notes: "Premium quality silk saree with golden border",
      },
      materials: ["Silk"],
      colors: ["Red"],
      tags: ["premium", "wedding", "traditional"],
    },
    {
      product: {
        company_id: companyId,
        name: "Cotton Kurta Fabric",
        gsm: 150,
        thread_count_cm: 60,
        stock_type: "roll",
        measuring_unit: "metre",
        cost_price_per_unit: 450.0,
        selling_price_per_unit: 650.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 50,
        hsn_code: "5208",
        tax_type: "no_tax",
        gst_rate: null,
        notes: "Pure cotton fabric ideal for summer kurtas",
      },
      materials: ["Cotton"],
      colors: ["White"],
      tags: ["summer", "breathable", "casual"],
    },
    {
      product: {
        company_id: companyId,
        name: "Woolen Shawl Material",
        gsm: 200,
        thread_count_cm: 50,
        stock_type: "roll",
        measuring_unit: "yard",
        cost_price_per_unit: 1800.0,
        selling_price_per_unit: 2500.0,
        show_on_catalog: true,
        min_stock_alert: false,
        hsn_code: "5111",
        tax_type: "gst",
        gst_rate: 12,
        notes: "High-quality woolen fabric for shawls",
      },
      materials: ["Wool"],
      colors: ["Black"],
      tags: ["winter", "warm", "premium"],
    },
    {
      product: {
        company_id: companyId,
        name: "Polyester Blend Dress Material",
        gsm: 180,
        thread_count_cm: 70,
        stock_type: "roll",
        measuring_unit: "metre",
        cost_price_per_unit: 350.0,
        selling_price_per_unit: 550.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 30,
        hsn_code: "5407",
        tax_type: "no_tax",
        gst_rate: null,
      },
      materials: ["Polyester"],
      colors: ["Blue"],
      tags: ["modern", "formal", "wrinkle-free"],
    },
    {
      product: {
        company_id: companyId,
        name: "Linen Summer Fabric",
        gsm: 140,
        thread_count_cm: 55,
        stock_type: "roll",
        measuring_unit: "kilogram",
        cost_price_per_unit: 800.0,
        selling_price_per_unit: 1200.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 20,
        hsn_code: "5309",
        tax_type: "gst",
        gst_rate: 5,
        notes: "Eco-friendly linen fabric for summer wear",
      },
      materials: ["Linen"],
      colors: ["White"],
      tags: ["summer", "eco-friendly", "breathable"],
    },
    {
      product: {
        company_id: companyId,
        name: "Designer Silk Fabric",
        gsm: 110,
        thread_count_cm: 75,
        stock_type: "batch",
        measuring_unit: "unit",
        cost_price_per_unit: 3000.0,
        selling_price_per_unit: 4200.0,
        show_on_catalog: false,
        min_stock_alert: false,
        hsn_code: "5007",
        tax_type: "gst",
        gst_rate: 5,
      },
      materials: ["Silk"],
      colors: ["Green"],
      tags: ["designer", "luxury", "festive"],
    },
    {
      product: {
        company_id: companyId,
        name: "Cotton Denim",
        gsm: 300,
        thread_count_cm: 40,
        stock_type: "batch",
        measuring_unit: "unit",
        cost_price_per_unit: 600.0,
        selling_price_per_unit: 900.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 40,
        hsn_code: "5209",
        tax_type: "no_tax",
        gst_rate: null,
        notes: "Heavy-duty cotton denim fabric",
      },
      materials: ["Denim"],
      colors: ["Blue"],
      tags: ["denim", "casual", "durable"],
    },
    {
      product: {
        company_id: companyId,
        name: "Yellow Cotton Print",
        gsm: 130,
        thread_count_cm: 65,
        stock_type: "piece",
        measuring_unit: null,
        cost_price_per_unit: 400.0,
        selling_price_per_unit: 600.0,
        show_on_catalog: true,
        min_stock_alert: true,
        min_stock_threshold: 25,
        hsn_code: "5208",
        tax_type: "gst",
        gst_rate: 5,
      },
      materials: ["Cotton"],
      colors: ["Yellow"],
      tags: ["printed", "colorful", "casual"],
    },
  ];

  console.log("\nCreating products and linking attributes...");
  for (const item of testProducts) {
    const { data, error } = await supabase
      .from("products")
      .insert({
        ...item.product,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to create product: ${item.product.name}`);
      console.error(`   Error: ${error.message}`);
      continue;
    }

    const productId = data.id;
    console.log(
      `✅ Created product: ${item.product.name} (SEQ-${data.sequence_number})`,
    );

    // Link attributes (materials, colors, tags)
    const allAttributeIds = [
      ...item.materials.map((name) => materialIds[name]),
      ...item.colors.map((name) => colorIds[name]),
      ...item.tags.map((name) => tagIds[name]),
    ].filter(Boolean);

    if (allAttributeIds.length > 0) {
      const assignments = allAttributeIds.map((attributeId) => ({
        product_id: productId,
        attribute_id: attributeId,
      }));

      const { error: linkError } = await supabase
        .from("product_attribute_assignments")
        .insert(assignments);

      if (linkError) {
        console.error(`   ❌ Failed to link attributes: ${linkError.message}`);
      }
    }
  }

  console.log("\n✨ Test products with attributes created successfully!");

  // Note: Goods inwards and outwards creation removed
  // In the new design, users create stock units directly during goods inward
  // with complete details (size, quality, location, etc.)
  console.log(
    "\n⏭️  Skipping goods inwards/outwards (users create stock units directly)\n",
  );

  // Get partner IDs for use in inwards and outwards
  const { data: supplierPartners, error: supplierError } = await supabase
    .from("partners")
    .select("id")
    .eq("company_id", companyId)
    .eq("partner_type", "supplier")
    .limit(2);

  const { data: customerPartners, error: customerError } = await supabase
    .from("partners")
    .select("id")
    .eq("company_id", companyId)
    .eq("partner_type", "customer")
    .limit(2);

  if (supplierError || !supplierPartners || supplierPartners.length === 0) {
    console.error("❌ No suppliers found for creating inwards");
  } else if (
    customerError ||
    !customerPartners ||
    customerPartners.length === 0
  ) {
    console.error("❌ No customers found for creating outwards");
  } else {
    const supplierId1 = supplierPartners[0].id;
    const supplierId2 =
      supplierPartners.length > 1 ? supplierPartners[1].id : supplierId1;
    const customerId1 = customerPartners[0].id;
    const customerId2 =
      customerPartners.length > 1 ? customerPartners[1].id : customerId1;

    // Get product IDs
    const { data: productsList, error: productsError } = await supabase
      .from("products")
      .select("id")
      .eq("company_id", companyId)
      .limit(5);

    if (productsError || !productsList || productsList.length === 0) {
      console.error("❌ No products found for creating inwards/outwards");
    } else {
      // Create dates spanning 3 months
      const now = new Date();
      const month1 = new Date(now.getFullYear(), now.getMonth(), 15); // Current month, 15th
      const month2 = new Date(now.getFullYear(), now.getMonth() - 1, 20); // Last month, 20th
      const month3 = new Date(now.getFullYear(), now.getMonth() - 2, 10); // 2 months ago, 10th

      // Create 5 goods inwards
      const testInwards = [
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: "Purchase",
          partner_id: supplierId1,
          inward_date: month3.toISOString().split("T")[0],
          notes: "Received silk fabrics from supplier",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: "Purchase",
          partner_id: supplierId2,
          inward_date: month3.toISOString().split("T")[0],
          notes: "Cotton fabric purchase",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: "Purchase",
          partner_id: supplierId1,
          inward_date: month2.toISOString().split("T")[0],
          notes: "Premium woolen fabrics received",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: "Purchase",
          partner_id: supplierId2,
          inward_date: month2.toISOString().split("T")[0],
          notes: "Polyester blend materials",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          inward_type: "other",
          other_reason: "Purchase",
          partner_id: supplierId1,
          inward_date: month1.toISOString().split("T")[0],
          notes: "Linen fabric stock replenishment",
        },
      ];

      const inwardIds: string[] = [];

      for (const inwards of testInwards) {
        const { data, error } = await supabase
          .from("goods_inwards")
          .insert({
            ...inwards,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create inwards: ${error.message}`);
          continue;
        }

        const inwardId = data.id;
        inwardIds.push(inwardId);
        console.log(`✅ Created goods inwards: SEQ-${data.sequence_number}`);

        // Check if stock units already exist for this inwards
        const { data: existingStockUnits, error: checkStockError } =
          await supabase
            .from("stock_units")
            .select("id")
            .eq("created_from_inward_id", inwardId);

        if (checkStockError) {
          console.error(
            `   ❌ Failed to check existing stock units: ${checkStockError.message}`,
          );
          continue;
        }

        if (existingStockUnits && existingStockUnits.length > 0) {
          console.log(
            `   ⏭️  Stock units already exist (${existingStockUnits.length} units)`,
          );
          continue;
        }

        // Create stock units directly (2-3 products per inwards)
        const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 items
        for (let i = 0; i < itemCount && i < productsList.length; i++) {
          const quantityCount = Math.floor(Math.random() * 5) + 1; // 1-5 units per product

          // Create stock units for each quantity
          for (let j = 0; j < quantityCount; j++) {
            const quantity = parseFloat((Math.random() * 50 + 10).toFixed(2)); // Random size 10-60
            const { error: stockError } = await supabase
              .from("stock_units")
              .insert({
                company_id: companyId,
                warehouse_id: warehouseId,
                product_id: productsList[i].id,
                created_from_inward_id: inwardId,
                initial_quantity: quantity,
                remaining_quantity: quantity,
                quality_grade: ["A", "B", "C"][Math.floor(Math.random() * 3)],
                warehouse_location: `Rack ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10) + 1}`,
                manufacturing_date: inwards.inward_date,
                created_by: userId,
              });

            if (stockError) {
              console.error(
                `   ❌ Failed to create stock unit: ${stockError.message}`,
              );
            } else {
              console.log(
                `   ✅ Created stock unit ${j + 1}/${quantityCount} for product ${i + 1}`,
              );
            }
          }
        }
      }

      // Get stock units that were auto-created from inwards
      const { data: stockUnits, error: stockError } = await supabase
        .from("stock_units")
        .select("id")
        .eq("company_id", companyId)
        .in("status", ["full", "partial"])
        .limit(15);

      if (stockError || !stockUnits || stockUnits.length === 0) {
        console.error("❌ No stock units available for creating outwards");
      } else {
        // Create 5 goods outwards
        const testOutwards = [
          {
            company_id: companyId,
            warehouse_id: warehouseId,
            partner_id: customerId1,
            outward_type: "other",
            other_reason: "Sample outward for exhibition",
            outward_date: month3.toISOString().split("T")[0],
            notes: "Sample fabrics sent for trade show",
          },
          {
            company_id: companyId,
            warehouse_id: warehouseId,
            partner_id: customerId2,
            outward_type: "other",
            other_reason: "Quality testing at external lab",
            outward_date: month3.toISOString().split("T")[0],
            notes: "Silk samples for quality verification",
          },
          {
            company_id: companyId,
            warehouse_id: warehouseId,
            partner_id: customerId1,
            outward_type: "other",
            other_reason: "Customer sample approval",
            outward_date: month2.toISOString().split("T")[0],
            notes: "Cotton fabric samples for customer review",
          },
          {
            company_id: companyId,
            warehouse_id: warehouseId,
            partner_id: customerId2,
            outward_type: "other",
            other_reason: "Marketing material outward",
            outward_date: month2.toISOString().split("T")[0],
            notes: "Product samples for marketing campaign",
          },
          {
            company_id: companyId,
            warehouse_id: warehouseId,
            partner_id: customerId1,
            outward_type: "other",
            other_reason: "Demo pieces for new collection",
            outward_date: month1.toISOString().split("T")[0],
            notes: "New season collection samples",
          },
        ];

        let stockUnitIndex = 0;

        for (const outward of testOutwards) {
          // Prepare stock unit items (1-3 stock units per outward)
          const itemCount = Math.min(3, stockUnits.length - stockUnitIndex);
          const stockUnitItems = [];

          for (
            let i = 0;
            i < itemCount && stockUnitIndex < stockUnits.length;
            i++
          ) {
            // Get stock unit details to determine quantity to dispatch
            const { data: stockUnit } = await supabase
              .from("stock_units")
              .select("remaining_quantity")
              .eq("id", stockUnits[stockUnitIndex].id)
              .single();

            const dispatchQty = stockUnit?.remaining_quantity || 0;

            stockUnitItems.push({
              stock_unit_id: stockUnits[stockUnitIndex].id,
              quantity: dispatchQty, // Dispatch full quantity
            });

            stockUnitIndex++;
          }

          if (stockUnitItems.length === 0) {
            console.log(`⏭️  No stock units available for this outward`);
            continue;
          }

          // Use the atomic function to create outward with items
          const { error } = await supabase.rpc(
            "create_goods_outward_with_items",
            {
              p_outward_data: {
                ...outward,
                created_by: userId,
              },
              p_stock_unit_items: stockUnitItems,
            },
          );

          if (error) {
            console.error(`❌ Failed to create outward: ${error.message}`);
          } else {
            console.log(
              `✅ Created goods outward with ${stockUnitItems.length} items`,
            );
          }
        }
      }

      console.log("\n✨ Test goods inwards and outwards created successfully!");
    }
  }

  // Create sales orders
  console.log("\n📋 Creating test sales orders...\n");

  if (customerError || !customerPartners || customerPartners.length === 0) {
    console.error("❌ No customers found for creating sales orders");
  } else {
    const customerId1 = customerPartners[0].id;
    const customerId2 =
      customerPartners.length > 1 ? customerPartners[1].id : customerId1;

    // Get product IDs
    const { data: productsList, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .eq("company_id", companyId)
      .limit(8);

    if (productsError || !productsList || productsList.length === 0) {
      console.error("❌ No products found for creating sales orders");
    } else {
      // Create dates spanning 3 months
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 5);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 20);

      // Define 10 sales orders with different statuses
      const testSalesOrders = [
        // Two months ago - all completed/cancelled
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId1,
          order_date: twoMonthsAgo.toISOString().split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 10000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 5,
          notes: "Bulk order for wedding season",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId2,
          order_date: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 9000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 10,
          notes: "Regular customer order",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId1,
          order_date: new Date(
            twoMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "cancelled",
          advance_amount: 5000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 0,
          notes: "Cancelled due to design changes",
        },

        // Last month - mix of statuses
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId2,
          order_date: lastMonth.toISOString().split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 16000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 8,
          notes: "Premium silk order",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId1,
          order_date: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0], // Overdue
          status: "in_progress",
          advance_amount: 14000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 5,
          notes: "Delayed due to material shortage",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId2,
          order_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 11000.0,
          tax_type: "igst",
          discount_type: "percentage",
          discount_value: 12,
          notes: "Festive collection order",
        },

        // Current month - mostly pending/in progress
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId1,
          order_date: currentMonth.toISOString().split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          advance_amount: 17500.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 7,
          notes: "Awaiting customer approval on design",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId2,
          order_date: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "in_progress",
          advance_amount: 21000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 10,
          notes: "Large order in production",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId1,
          order_date: new Date(
            currentMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() - 2 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0], // Overdue
          status: "in_progress",
          advance_amount: 9500.0,
          tax_type: "no_tax",
          discount_type: "percentage",
          discount_value: 5,
          notes: "Rush order - overdue",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          customer_id: customerId2,
          order_date: new Date(
            currentMonth.getTime() + 15 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 30 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          advance_amount: 19000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 15,
          notes: "New customer - premium discount",
        },
      ];

      for (const order of testSalesOrders) {
        const { data, error } = await supabase
          .from("sales_orders")
          .insert({
            ...order,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create sales order: ${error.message}`);
          continue;
        }

        const orderId = data.id;
        console.log(
          `✅ Created sales order: SEQ-${data.sequence_number} (${order.status})`,
        );

        // Create order items (2-4 products per order)
        const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
        for (let i = 0; i < itemCount && i < productsList.length; i++) {
          const requiredQty = Math.floor(Math.random() * 20) + 5; // 5-25 units
          const dispatchedQty =
            order.status === "completed"
              ? requiredQty
              : order.status === "cancelled"
                ? 0
                : Math.floor(requiredQty * (Math.random() * 0.5 + 0.3)); // 30-80% dispatched

          const { error: itemError } = await supabase
            .from("sales_order_items")
            .insert({
              company_id: companyId,
              warehouse_id: warehouseId,
              sales_order_id: orderId,
              product_id: productsList[i].id,
              required_quantity: requiredQty,
              dispatched_quantity: dispatchedQty,
              notes: `${productsList[i].name} - ${requiredQty} units`,
            });

          if (itemError) {
            console.error(
              `   ❌ Failed to create order item: ${itemError.message}`,
            );
          } else {
            console.log(
              `   ✅ Added item: ${productsList[i].name} (${dispatchedQty}/${requiredQty} dispatched)`,
            );
          }
        }
      }

      console.log("\n✨ Test sales orders created successfully!");
    }
  }

  // Create purchase orders
  console.log("\n📦 Creating test purchase orders...\n");

  if (supplierError || !supplierPartners || supplierPartners.length === 0) {
    console.error("❌ No suppliers found for creating purchase orders");
  } else {
    const supplierId1 = supplierPartners[0].id;
    const supplierId2 =
      supplierPartners.length > 1 ? supplierPartners[1].id : supplierId1;

    // Get agent IDs if available
    const { data: agentPartners } = await supabase
      .from("partners")
      .select("id")
      .eq("company_id", companyId)
      .eq("partner_type", "agent")
      .limit(2);

    const agentId1 =
      agentPartners && agentPartners.length > 0 ? agentPartners[0].id : null;

    // Get product IDs
    const { data: productsList, error: productsError } = await supabase
      .from("products")
      .select("id, name")
      .eq("company_id", companyId)
      .limit(8);

    if (productsError || !productsList || productsList.length === 0) {
      console.error("❌ No products found for creating purchase orders");
    } else {
      // Create dates spanning 3 months
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 5);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 20);

      // Define 10 purchase orders with different statuses
      // Status distribution: 15% approval_pending, 25% in_progress, 50% completed, 10% cancelled
      const testPurchaseOrders = [
        // Two months ago - all completed/cancelled
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId1,
          agent_id: agentId1,
          order_date: twoMonthsAgo.toISOString().split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 15000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 5,
          payment_terms: "30 days net",
          supplier_invoice_number: "INV-2024-1001",
          notes: "Bulk fabric purchase for wedding season",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId2,
          order_date: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 12000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 8,
          payment_terms: "15 days net",
          supplier_invoice_number: "INV-2024-1002",
          notes: "Regular supplier order",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId1,
          order_date: new Date(
            twoMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            twoMonthsAgo.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "cancelled",
          advance_amount: 8000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 0,
          notes: "Cancelled due to quality issues",
          status_notes: "Supplier unable to meet quality standards",
        },

        // Last month - mix of statuses
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId2,
          agent_id: agentId1,
          order_date: lastMonth.toISOString().split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 20000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 10,
          payment_terms: "45 days net",
          supplier_invoice_number: "INV-2024-1003",
          notes: "Premium silk fabrics order",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId1,
          order_date: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0], // Overdue
          status: "in_progress",
          advance_amount: 18000.0,
          tax_type: "igst",
          discount_type: "percentage",
          discount_value: 5,
          payment_terms: "30 days net",
          notes: "Delayed shipment from supplier",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId2,
          order_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            lastMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 16000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 12,
          payment_terms: "20 days net",
          supplier_invoice_number: "INV-2024-1004",
          notes: "Cotton fabric stock replenishment",
        },

        // Current month - mostly pending/in progress
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId1,
          agent_id: agentId1,
          order_date: currentMonth.toISOString().split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          advance_amount: 22000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 7,
          payment_terms: "30 days net",
          notes: "Awaiting management approval",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId2,
          order_date: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "in_progress",
          advance_amount: 26000.0,
          tax_type: "no_tax",
          discount_type: "percentage",
          discount_value: 10,
          payment_terms: "45 days net",
          notes: "Large order - partial shipment received",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId1,
          order_date: new Date(
            currentMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 30 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          advance_amount: 14000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 5,
          payment_terms: "15 days net",
          supplier_invoice_number: "INV-2024-1005",
          notes: "Express delivery completed",
        },
        {
          company_id: companyId,
          warehouse_id: warehouseId,
          supplier_id: supplierId2,
          agent_id: agentId1,
          order_date: new Date(
            currentMonth.getTime() + 15 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          delivery_due_date: new Date(
            currentMonth.getTime() + 30 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          advance_amount: 24000.0,
          tax_type: "gst",
          discount_type: "percentage",
          discount_value: 15,
          payment_terms: "60 days net",
          notes: "New supplier - awaiting approval",
        },
      ];

      for (const order of testPurchaseOrders) {
        const { data, error } = await supabase
          .from("purchase_orders")
          .insert({
            ...order,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create purchase order: ${error.message}`);
          continue;
        }

        const orderId = data.id;
        console.log(
          `✅ Created purchase order: PO-${data.sequence_number} (${order.status})`,
        );

        // Create order items (2-4 products per order)
        const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
        for (let i = 0; i < itemCount && i < productsList.length; i++) {
          const requiredQty = Math.floor(Math.random() * 20) + 5; // 5-25 units
          const receivedQty =
            order.status === "completed"
              ? requiredQty
              : order.status === "cancelled"
                ? 0
                : Math.floor(requiredQty * (Math.random() * 0.5 + 0.3)); // 30-80% received

          const { error: itemError } = await supabase
            .from("purchase_order_items")
            .insert({
              company_id: companyId,
              warehouse_id: warehouseId,
              purchase_order_id: orderId,
              product_id: productsList[i].id,
              required_quantity: requiredQty,
              received_quantity: receivedQty,
              notes: `${productsList[i].name} - ${requiredQty} units`,
            });

          if (itemError) {
            console.error(
              `   ❌ Failed to create order item: ${itemError.message}`,
            );
          } else {
            console.log(
              `   ✅ Added item: ${productsList[i].name} (${receivedQty}/${requiredQty} received)`,
            );
          }
        }
      }

      console.log("\n✨ Test purchase orders created successfully!");
    }
  }

  // Create QR code batches
  console.log("\n📱 Creating test QR code batches...\n");

  // Get some stock units to use in batches
  const { data: availableStockUnits, error: stockUnitsError } = await supabase
    .from("stock_units")
    .select("id")
    .eq("company_id", companyId)
    .eq("warehouse_id", warehouseId)
    .in("status", ["full", "partial"])
    .limit(20);

  if (
    stockUnitsError ||
    !availableStockUnits ||
    availableStockUnits.length === 0
  ) {
    console.error("❌ No stock units found for creating QR batches");
  } else {
    // Create dates spanning 3 months
    const now = new Date();
    const month1 = new Date(now.getFullYear(), now.getMonth(), 10); // Current month
    const month2 = new Date(now.getFullYear(), now.getMonth() - 1, 15); // Last month
    const month3 = new Date(now.getFullYear(), now.getMonth() - 2, 20); // 2 months ago

    const testBatches = [
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Silk Saree Collection - Jan 2025",
        fields_selected: [
          "product_name",
          "quality_grade",
          "location",
          "qr_code",
        ],
        pdf_url: null, // Would be generated when batch is actually created
        image_url: null,
        created_at: month3.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Cotton Fabric Batch #2",
        fields_selected: ["product_name", "size", "quality_grade", "qr_code"],
        pdf_url: null,
        image_url: null,
        created_at: month3.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Premium Woolen Stock",
        fields_selected: [
          "product_name",
          "quality_grade",
          "supplier_number",
          "location",
          "qr_code",
        ],
        pdf_url: null,
        image_url: null,
        created_at: month2.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "New Arrivals - March",
        fields_selected: ["product_name", "color", "size", "qr_code"],
        pdf_url: null,
        image_url: null,
        created_at: month2.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Export Ready Stock",
        fields_selected: [
          "product_name",
          "quality_grade",
          "location",
          "manufacturing_date",
          "qr_code",
        ],
        pdf_url: null,
        image_url: null,
        created_at: month2.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Warehouse Audit Batch",
        fields_selected: ["product_name", "size", "location", "qr_code"],
        pdf_url: null,
        image_url: null,
        created_at: month1.toISOString(),
      },
      {
        company_id: companyId,
        warehouse_id: warehouseId,
        batch_name: "Festival Collection QRs",
        fields_selected: ["product_name", "color", "quality_grade", "qr_code"],
        pdf_url: null,
        image_url: null,
        created_at: month1.toISOString(),
      },
    ];

    let stockUnitIndex = 0;

    for (const batch of testBatches) {
      // Check if batch already exists
      const { data: existingBatch } = await supabase
        .from("qr_batches")
        .select("id, batch_name")
        .eq("company_id", companyId)
        .eq("batch_name", batch.batch_name)
        .single();

      let batchId: string;

      if (existingBatch) {
        console.log(`⏭️  Batch "${batch.batch_name}" already exists`);
        batchId = existingBatch.id;
      } else {
        const { data, error } = await supabase
          .from("qr_batches")
          .insert({
            ...batch,
            created_by: userId,
          })
          .select()
          .single();

        if (error) {
          console.error(`❌ Failed to create batch: ${batch.batch_name}`);
          console.error(`   Error: ${error.message}`);
          continue;
        } else {
          batchId = data.id;
          console.log(`✅ Created QR batch: ${batch.batch_name}`);
        }
      }

      // Check if batch items already exist
      const { data: existingItems, error: checkItemsError } = await supabase
        .from("qr_batch_items")
        .select("id")
        .eq("batch_id", batchId);

      if (checkItemsError) {
        console.error(
          `   ❌ Failed to check existing items: ${checkItemsError.message}`,
        );
        continue;
      }

      if (existingItems && existingItems.length > 0) {
        console.log(
          `   ⏭️  Batch items already exist (${existingItems.length} items)`,
        );
        stockUnitIndex += existingItems.length;
        continue;
      }

      // Add stock units to batch (3-5 units per batch)
      const itemCount = Math.min(
        Math.floor(Math.random() * 3) + 3, // 3-5 items
        availableStockUnits.length - stockUnitIndex,
      );

      for (
        let i = 0;
        i < itemCount && stockUnitIndex < availableStockUnits.length;
        i++
      ) {
        const { error: itemError } = await supabase
          .from("qr_batch_items")
          .insert({
            company_id: companyId,
            warehouse_id: warehouseId,
            batch_id: batchId,
            stock_unit_id: availableStockUnits[stockUnitIndex].id,
          });

        if (itemError) {
          console.error(
            `   ❌ Failed to add item to batch: ${itemError.message}`,
          );
        } else {
          console.log(`   ✅ Added item ${i + 1}/${itemCount} to batch`);
        }

        stockUnitIndex++;
      }
    }

    console.log("\n✨ Test QR code batches created successfully!");
  }

  // ================================================
  // ACCOUNTING: Invoices, Adjustment Notes, Payments
  // ================================================

  // Fetch ledger IDs for invoices and payments
  console.log("\n💰 Fetching ledgers for accounting...\n");

  const { data: ledgers, error: ledgersError } = await supabase
    .from("ledgers")
    .select("id, name, ledger_type, partner_id")
    .eq("company_id", companyId);

  if (ledgersError || !ledgers || ledgers.length === 0) {
    console.error("❌ No ledgers found. Ledgers should be auto-created!");
    console.error(
      "   Make sure migration 0060_auto_create_ledgers.sql is applied.",
    );
  } else {
    console.log(`✅ Found ${ledgers.length} ledgers`);

    // Create dates spanning 3 months for invoices and payments
    const now = new Date();
    const month1 = new Date(now.getFullYear(), now.getMonth(), 10); // Current month
    const month2 = new Date(now.getFullYear(), now.getMonth() - 1, 15); // Last month
    const month3 = new Date(now.getFullYear(), now.getMonth() - 2, 20); // 2 months ago

    // Map ledgers by type and partner
    const salesLedger = ledgers.find((l) => l.name === "Sales");
    const salesReturnLedger = ledgers.find((l) => l.name === "Sales Return");
    const purchaseLedger = ledgers.find((l) => l.name === "Purchase");
    const purchaseReturnLedger = ledgers.find(
      (l) => l.name === "Purchase Return",
    );
    const cashLedger = ledgers.find((l) => l.ledger_type === "cash");
    const bankLedger = ledgers.find((l) => l.ledger_type === "bank");
    const tdsPayableLedger = ledgers.find((l) => l.name === "TDS Payable");
    const tcsReceivableLedger = ledgers.find(
      (l) => l.name === "TCS Receivable",
    );
    const partyLedgers = ledgers.filter((l) => l.ledger_type === "party");

    // Validate required ledgers exist
    if (!salesLedger) {
      console.error("❌ Sales ledger not found!");
      return;
    }
    if (!salesReturnLedger) {
      console.error("❌ Sales Return ledger not found!");
      return;
    }
    if (!purchaseLedger) {
      console.error("❌ Purchase ledger not found!");
      return;
    }
    if (!purchaseReturnLedger) {
      console.error("❌ Purchase Return ledger not found!");
      return;
    }

    // Map partner IDs to their ledger IDs
    const partnerLedgerMap = new Map<string, string>();
    partyLedgers.forEach((ledger) => {
      if (ledger.partner_id) {
        partnerLedgerMap.set(ledger.partner_id, ledger.id);
      }
    });

    if (
      customerError ||
      !customerPartners ||
      customerPartners.length === 0 ||
      supplierError ||
      !supplierPartners ||
      supplierPartners.length === 0
    ) {
      console.error(
        "❌ Customers or suppliers not available for invoices (already checked earlier)",
      );
    } else {
      // ================================================
      // SALES INVOICES
      // ================================================
      console.log("\n📄 Creating sales invoices...\n");

      // Get goods outwards to link
      const { data: goodsOutwards, error: outwardsError } = await supabase
        .from("goods_outwards")
        .select("id, outward_date")
        .eq("company_id", companyId)
        .order("outward_date", { ascending: true })
        .limit(12);

      if (outwardsError || !goodsOutwards || goodsOutwards.length === 0) {
        console.error("❌ No goods outwards found for sales invoices");
      } else {
        console.log(`   Found ${goodsOutwards.length} goods outwards\n`);

        // Get products for invoice items
        const { data: invoiceProducts, error: invProdError } = await supabase
          .from("products")
          .select("id, cost_price_per_unit, selling_price_per_unit, gst_rate")
          .eq("company_id", companyId)
          .limit(8);

        if (invProdError || !invoiceProducts || invoiceProducts.length === 0) {
          console.error("❌ No products found for invoice items");
        } else {
          const salesInvoiceData = [
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[0]?.id,
              invoice_date: goodsOutwards[0]?.outward_date || month3,
              tax_type: "gst",
              discount_type: "none",
              discount_value: 0,
              items: [
                {
                  product_id: invoiceProducts[0].id,
                  quantity: 10,
                  rate: invoiceProducts[0].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[1].id,
                  quantity: 15,
                  rate: invoiceProducts[1].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[1]?.id,
              invoice_date: goodsOutwards[1]?.outward_date || month3,
              tax_type: "igst",
              discount_type: "percentage",
              discount_value: 5,
              items: [
                {
                  product_id: invoiceProducts[2].id,
                  quantity: 20,
                  rate: invoiceProducts[2].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[3].id,
                  quantity: 12,
                  rate: invoiceProducts[3].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[2]?.id,
              invoice_date: goodsOutwards[2]?.outward_date || month3,
              tax_type: "no_tax",
              discount_type: "flat_amount",
              discount_value: 500,
              items: [
                {
                  product_id: invoiceProducts[4].id,
                  quantity: 25,
                  rate: invoiceProducts[4].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[3]?.id,
              invoice_date: goodsOutwards[3]?.outward_date || month2,
              tax_type: "gst",
              discount_type: "percentage",
              discount_value: 10,
              items: [
                {
                  product_id: invoiceProducts[5].id,
                  quantity: 18,
                  rate: invoiceProducts[5].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[6].id,
                  quantity: 22,
                  rate: invoiceProducts[6].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[7].id,
                  quantity: 8,
                  rate: invoiceProducts[7].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[4]?.id,
              invoice_date: goodsOutwards[4]?.outward_date || month2,
              tax_type: "igst",
              discount_type: "none",
              discount_value: 0,
              items: [
                {
                  product_id: invoiceProducts[0].id,
                  quantity: 30,
                  rate: invoiceProducts[0].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[2].id,
                  quantity: 15,
                  rate: invoiceProducts[2].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[5]?.id,
              invoice_date: goodsOutwards[5]?.outward_date || month2,
              tax_type: "gst",
              discount_type: "flat_amount",
              discount_value: 1000,
              items: [
                {
                  product_id: invoiceProducts[1].id,
                  quantity: 40,
                  rate: invoiceProducts[1].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[6]?.id,
              invoice_date: goodsOutwards[6]?.outward_date || month1,
              tax_type: "no_tax",
              discount_type: "none",
              discount_value: 0,
              items: [
                {
                  product_id: invoiceProducts[3].id,
                  quantity: 12,
                  rate: invoiceProducts[3].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[4].id,
                  quantity: 18,
                  rate: invoiceProducts[4].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[7]?.id,
              invoice_date: goodsOutwards[7]?.outward_date || month1,
              tax_type: "gst",
              discount_type: "percentage",
              discount_value: 8,
              items: [
                {
                  product_id: invoiceProducts[5].id,
                  quantity: 35,
                  rate: invoiceProducts[5].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[6].id,
                  quantity: 20,
                  rate: invoiceProducts[6].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[8]?.id,
              invoice_date: goodsOutwards[8]?.outward_date || month1,
              tax_type: "igst",
              discount_type: "percentage",
              discount_value: 5,
              items: [
                {
                  product_id: invoiceProducts[7].id,
                  quantity: 25,
                  rate: invoiceProducts[7].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[0].id,
                  quantity: 10,
                  rate: invoiceProducts[0].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[9]?.id,
              invoice_date: goodsOutwards[9]?.outward_date || month1,
              tax_type: "gst",
              discount_type: "none",
              discount_value: 0,
              items: [
                {
                  product_id: invoiceProducts[1].id,
                  quantity: 50,
                  rate: invoiceProducts[1].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[0].id,
              outward_id: goodsOutwards[10]?.id,
              invoice_date: goodsOutwards[10]?.outward_date || month1,
              tax_type: "no_tax",
              discount_type: "flat_amount",
              discount_value: 750,
              items: [
                {
                  product_id: invoiceProducts[2].id,
                  quantity: 28,
                  rate: invoiceProducts[2].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[3].id,
                  quantity: 16,
                  rate: invoiceProducts[3].selling_price_per_unit,
                },
              ],
            },
            {
              customer_id: customerPartners[1]?.id || customerPartners[0].id,
              outward_id: goodsOutwards[11]?.id,
              invoice_date: goodsOutwards[11]?.outward_date || month1,
              tax_type: "gst",
              discount_type: "percentage",
              discount_value: 12,
              items: [
                {
                  product_id: invoiceProducts[4].id,
                  quantity: 45,
                  rate: invoiceProducts[4].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[5].id,
                  quantity: 22,
                  rate: invoiceProducts[5].selling_price_per_unit,
                },
                {
                  product_id: invoiceProducts[6].id,
                  quantity: 14,
                  rate: invoiceProducts[6].selling_price_per_unit,
                },
              ],
            },
          ];

          const salesInvoiceIds: string[] = [];

          for (const invoice of salesInvoiceData) {
            const partyLedgerId = partnerLedgerMap.get(invoice.customer_id);
            if (!partyLedgerId) {
              console.error(
                `   ❌ No party ledger found for customer ${invoice.customer_id}`,
              );
              continue;
            }

            const { data: invoiceSlug, error: invoiceError } =
              await supabase.rpc("create_invoice_with_items", {
                p_invoice_type: "sales",
                p_party_ledger_id: partyLedgerId,
                p_counter_ledger_id: salesLedger.id,
                p_warehouse_id: warehouseId,
                p_invoice_date: invoice.invoice_date,
                p_payment_terms: "Net 30 days",
                p_due_date: new Date(
                  new Date(invoice.invoice_date).getTime() +
                    30 * 24 * 60 * 60 * 1000,
                )
                  .toISOString()
                  .split("T")[0],
                p_tax_type: invoice.tax_type,
                p_discount_type: invoice.discount_type,
                p_discount_value: invoice.discount_value,
                p_supplier_invoice_number: null,
                p_supplier_invoice_date: null,
                p_notes: "Test sales invoice - auto-generated",
                p_attachments: [],
                p_items: invoice.items,
                p_goods_movement_ids: invoice.outward_id
                  ? [invoice.outward_id]
                  : [],
                p_company_id: companyId,
              });

            if (invoiceError) {
              console.error(
                `   ❌ Failed to create sales invoice: ${invoiceError.message}`,
              );
            } else {
              console.log(`   ✅ Created sales invoice: ${invoiceSlug}`);

              // Get the invoice ID for later use
              const { data: invoiceRecord } = await supabase
                .from("invoices")
                .select("id")
                .eq("slug", invoiceSlug)
                .single();

              if (invoiceRecord) {
                salesInvoiceIds.push(invoiceRecord.id);
              }
            }
          }

          console.log(
            `\n✨ Created ${salesInvoiceIds.length} sales invoices successfully!\n`,
          );

          // ================================================
          // PURCHASE INVOICES
          // ================================================
          console.log("📦 Creating purchase invoices...\n");

          // Get goods inwards to link
          const { data: goodsInwards, error: inwardsError } = await supabase
            .from("goods_inwards")
            .select("id, inward_date")
            .eq("company_id", companyId)
            .order("inward_date", { ascending: true })
            .limit(12);

          if (inwardsError || !goodsInwards || goodsInwards.length === 0) {
            console.error("❌ No goods inwards found for purchase invoices");
          } else {
            console.log(`   Found ${goodsInwards.length} goods inwards\n`);

            const purchaseInvoiceData = [
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[0]?.id,
                invoice_date: goodsInwards[0]?.inward_date || month3,
                tax_type: "gst",
                discount_type: "none",
                discount_value: 0,
                supplier_invoice_number: "SUP-INV-001",
                items: [
                  {
                    product_id: invoiceProducts[0].id,
                    quantity: 50,
                    rate: invoiceProducts[0].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[1].id,
                    quantity: 40,
                    rate: invoiceProducts[1].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[1]?.id,
                invoice_date: goodsInwards[1]?.inward_date || month3,
                tax_type: "igst",
                discount_type: "percentage",
                discount_value: 8,
                supplier_invoice_number: "SUP-INV-002",
                items: [
                  {
                    product_id: invoiceProducts[2].id,
                    quantity: 60,
                    rate: invoiceProducts[2].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[2]?.id,
                invoice_date: goodsInwards[2]?.inward_date || month3,
                tax_type: "no_tax",
                discount_type: "flat_amount",
                discount_value: 2000,
                supplier_invoice_number: "SUP-INV-003",
                items: [
                  {
                    product_id: invoiceProducts[3].id,
                    quantity: 100,
                    rate: invoiceProducts[3].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[4].id,
                    quantity: 75,
                    rate: invoiceProducts[4].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[3]?.id,
                invoice_date: goodsInwards[3]?.inward_date || month2,
                tax_type: "gst",
                discount_type: "percentage",
                discount_value: 5,
                supplier_invoice_number: "SUP-INV-004",
                items: [
                  {
                    product_id: invoiceProducts[5].id,
                    quantity: 55,
                    rate: invoiceProducts[5].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[6].id,
                    quantity: 45,
                    rate: invoiceProducts[6].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[4]?.id,
                invoice_date: goodsInwards[4]?.inward_date || month2,
                tax_type: "igst",
                discount_type: "none",
                discount_value: 0,
                supplier_invoice_number: "SUP-INV-005",
                items: [
                  {
                    product_id: invoiceProducts[7].id,
                    quantity: 80,
                    rate: invoiceProducts[7].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[5]?.id,
                invoice_date: goodsInwards[5]?.inward_date || month2,
                tax_type: "gst",
                discount_type: "flat_amount",
                discount_value: 1500,
                supplier_invoice_number: "SUP-INV-006",
                items: [
                  {
                    product_id: invoiceProducts[0].id,
                    quantity: 90,
                    rate: invoiceProducts[0].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[2].id,
                    quantity: 70,
                    rate: invoiceProducts[2].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[6]?.id,
                invoice_date: goodsInwards[6]?.inward_date || month1,
                tax_type: "no_tax",
                discount_type: "percentage",
                discount_value: 10,
                supplier_invoice_number: "SUP-INV-007",
                items: [
                  {
                    product_id: invoiceProducts[1].id,
                    quantity: 65,
                    rate: invoiceProducts[1].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[7]?.id,
                invoice_date: goodsInwards[7]?.inward_date || month1,
                tax_type: "gst",
                discount_type: "none",
                discount_value: 0,
                supplier_invoice_number: "SUP-INV-008",
                items: [
                  {
                    product_id: invoiceProducts[3].id,
                    quantity: 120,
                    rate: invoiceProducts[3].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[4].id,
                    quantity: 85,
                    rate: invoiceProducts[4].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[8]?.id,
                invoice_date: goodsInwards[8]?.inward_date || month1,
                tax_type: "igst",
                discount_type: "percentage",
                discount_value: 7,
                supplier_invoice_number: "SUP-INV-009",
                items: [
                  {
                    product_id: invoiceProducts[5].id,
                    quantity: 95,
                    rate: invoiceProducts[5].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[9]?.id,
                invoice_date: goodsInwards[9]?.inward_date || month1,
                tax_type: "gst",
                discount_type: "flat_amount",
                discount_value: 2500,
                supplier_invoice_number: "SUP-INV-010",
                items: [
                  {
                    product_id: invoiceProducts[6].id,
                    quantity: 110,
                    rate: invoiceProducts[6].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[7].id,
                    quantity: 75,
                    rate: invoiceProducts[7].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[0].id,
                inward_id: goodsInwards[10]?.id,
                invoice_date: goodsInwards[10]?.inward_date || month1,
                tax_type: "no_tax",
                discount_type: "none",
                discount_value: 0,
                supplier_invoice_number: "SUP-INV-011",
                items: [
                  {
                    product_id: invoiceProducts[0].id,
                    quantity: 130,
                    rate: invoiceProducts[0].cost_price_per_unit,
                  },
                ],
              },
              {
                supplier_id: supplierPartners[1]?.id || supplierPartners[0].id,
                inward_id: goodsInwards[11]?.id,
                invoice_date: goodsInwards[11]?.inward_date || month1,
                tax_type: "gst",
                discount_type: "percentage",
                discount_value: 12,
                supplier_invoice_number: "SUP-INV-012",
                items: [
                  {
                    product_id: invoiceProducts[1].id,
                    quantity: 88,
                    rate: invoiceProducts[1].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[2].id,
                    quantity: 92,
                    rate: invoiceProducts[2].cost_price_per_unit,
                  },
                  {
                    product_id: invoiceProducts[3].id,
                    quantity: 66,
                    rate: invoiceProducts[3].cost_price_per_unit,
                  },
                ],
              },
            ];

            const purchaseInvoiceIds: string[] = [];

            for (const invoice of purchaseInvoiceData) {
              const partyLedgerId = partnerLedgerMap.get(invoice.supplier_id);
              if (!partyLedgerId) {
                console.error(
                  `   ❌ No party ledger found for supplier ${invoice.supplier_id}`,
                );
                continue;
              }

              const { data: invoiceSlug, error: invoiceError } =
                await supabase.rpc("create_invoice_with_items", {
                  p_invoice_type: "purchase",
                  p_party_ledger_id: partyLedgerId,
                  p_counter_ledger_id: purchaseLedger.id,
                  p_warehouse_id: warehouseId,
                  p_invoice_date: invoice.invoice_date,
                  p_payment_terms: "Net 30 days",
                  p_due_date: new Date(
                    new Date(invoice.invoice_date).getTime() +
                      30 * 24 * 60 * 60 * 1000,
                  )
                    .toISOString()
                    .split("T")[0],
                  p_tax_type: invoice.tax_type,
                  p_discount_type: invoice.discount_type,
                  p_discount_value: invoice.discount_value,
                  p_supplier_invoice_number: invoice.supplier_invoice_number,
                  p_supplier_invoice_date: invoice.invoice_date,
                  p_notes: "Test purchase invoice - auto-generated",
                  p_attachments: [],
                  p_items: invoice.items,
                  p_goods_movement_ids: invoice.inward_id
                    ? [invoice.inward_id]
                    : [],
                  p_company_id: companyId,
                });

              if (invoiceError) {
                console.error(
                  `   ❌ Failed to create purchase invoice: ${invoiceError.message}`,
                );
              } else {
                console.log(`   ✅ Created purchase invoice: ${invoiceSlug}`);

                // Get the invoice ID for later use
                const { data: invoiceRecord } = await supabase
                  .from("invoices")
                  .select("id")
                  .eq("slug", invoiceSlug)
                  .single();

                if (invoiceRecord) {
                  purchaseInvoiceIds.push(invoiceRecord.id);
                }
              }
            }

            console.log(
              `\n✨ Created ${purchaseInvoiceIds.length} purchase invoices successfully!\n`,
            );

            // ================================================
            // ADJUSTMENT NOTES
            // ================================================
            console.log("📝 Creating adjustment notes...\n");

            const allInvoiceIds = [...salesInvoiceIds, ...purchaseInvoiceIds];

            if (allInvoiceIds.length === 0) {
              console.error("❌ No invoices available for adjustment notes");
            } else {
              const adjustmentNoteData = [
                // Credit Notes
                {
                  invoice_id: salesInvoiceIds[0],
                  adjustment_type: "credit",
                  reason: "Price correction as per agreement with customer",
                  items: [
                    {
                      product_id: invoiceProducts[0].id,
                      quantity: 2,
                      rate: invoiceProducts[0].selling_price_per_unit,
                      gst_rate: invoiceProducts[0].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: purchaseInvoiceIds[0],
                  adjustment_type: "credit",
                  reason: "Damaged goods return - 10% quantity found defective",
                  items: [
                    {
                      product_id: invoiceProducts[1].id,
                      quantity: 4,
                      rate: invoiceProducts[1].cost_price_per_unit,
                      gst_rate: invoiceProducts[1].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: salesInvoiceIds[1],
                  adjustment_type: "credit",
                  reason: "Billing error - incorrect GST rate applied",
                  items: [
                    {
                      product_id: invoiceProducts[2].id,
                      quantity: 3,
                      rate: invoiceProducts[2].selling_price_per_unit,
                      gst_rate: invoiceProducts[2].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: salesInvoiceIds[2],
                  adjustment_type: "credit",
                  reason: "Customer complaint - goodwill adjustment",
                  items: [
                    {
                      product_id: invoiceProducts[3].id,
                      quantity: 5,
                      rate: invoiceProducts[3].selling_price_per_unit,
                      gst_rate: invoiceProducts[3].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: purchaseInvoiceIds[1],
                  adjustment_type: "credit",
                  reason: "Supplier credit for quality issues",
                  items: [
                    {
                      product_id: invoiceProducts[4].id,
                      quantity: 6,
                      rate: invoiceProducts[4].cost_price_per_unit,
                      gst_rate: invoiceProducts[4].gst_rate,
                    },
                  ],
                },
                // Debit Notes
                {
                  invoice_id: salesInvoiceIds[3],
                  adjustment_type: "debit",
                  reason: "Additional packing charges not included",
                  items: [
                    {
                      product_id: invoiceProducts[5].id,
                      quantity: 2,
                      rate: 100,
                      gst_rate: invoiceProducts[5].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: purchaseInvoiceIds[2],
                  adjustment_type: "debit",
                  reason: "Price revision as per market rate increase",
                  items: [
                    {
                      product_id: invoiceProducts[6].id,
                      quantity: 3,
                      rate: invoiceProducts[6].cost_price_per_unit * 0.1,
                      gst_rate: invoiceProducts[6].gst_rate,
                    },
                  ],
                },
                {
                  invoice_id: salesInvoiceIds[4],
                  adjustment_type: "debit",
                  reason: "Freight charges not included in original invoice",
                  items: [
                    {
                      product_id: invoiceProducts[7].id,
                      quantity: 1,
                      rate: 500,
                      gst_rate: invoiceProducts[7].gst_rate,
                    },
                  ],
                },
              ];

              for (const note of adjustmentNoteData) {
                if (!note.invoice_id) {
                  continue;
                }

                // Fetch invoice details to determine counter ledger
                const { data: invoice } = await supabase
                  .from("invoices")
                  .select("invoice_type, outstanding_amount")
                  .eq("id", note.invoice_id)
                  .single();

                if (!invoice) {
                  console.error(
                    `   ❌ Invoice not found for adjustment note: ${note.invoice_id}`,
                  );
                  continue;
                }

                // Check if invoice has sufficient outstanding for credit notes
                if (
                  note.adjustment_type === "credit" &&
                  invoice.outstanding_amount === 0
                ) {
                  console.log(
                    `   ⏭️  Skipping credit note - invoice already fully paid/credited`,
                  );
                  continue;
                }

                // Determine counter ledger based on invoice type + adjustment type
                let counterLedgerId: string;
                if (note.adjustment_type === "credit") {
                  // Credit Note: Sales Return or Purchase Return
                  counterLedgerId =
                    invoice.invoice_type === "sales"
                      ? salesReturnLedger.id
                      : purchaseReturnLedger.id;
                } else {
                  // Debit Note: Sales or Purchase
                  counterLedgerId =
                    invoice.invoice_type === "sales"
                      ? salesLedger.id
                      : purchaseLedger.id;
                }

                const { data: adjustmentNoteId, error: adjError } =
                  await supabase.rpc("create_adjustment_note_with_items", {
                    p_invoice_id: note.invoice_id,
                    p_warehouse_id: warehouseId,
                    p_counter_ledger_id: counterLedgerId,
                    p_adjustment_type: note.adjustment_type,
                    p_adjustment_date: new Date().toISOString().split("T")[0],
                    p_reason: note.reason,
                    p_notes: `Test ${note.adjustment_type} note - auto-generated`,
                    p_attachments: [],
                    p_items: note.items,
                    p_company_id: companyId,
                  });

                if (adjError) {
                  console.error(
                    `   ❌ Failed to create ${note.adjustment_type} note: ${adjError.message}`,
                  );
                } else {
                  // Fetch the adjustment note number for logging
                  const { data: adjNote } = await supabase
                    .from("adjustment_notes")
                    .select("adjustment_number")
                    .eq("id", adjustmentNoteId)
                    .single();

                  console.log(
                    `   ✅ Created ${note.adjustment_type} note: ${adjNote?.adjustment_number || adjustmentNoteId}`,
                  );
                }
              }

              console.log("\n✨ Adjustment notes created successfully!\n");
            }

            // ================================================
            // PAYMENTS
            // ================================================
            console.log("💳 Creating payments...\n");

            if (!cashLedger || !bankLedger) {
              console.error(
                "❌ Cash or Bank ledger not found. Cannot create payments.",
              );
            } else {
              // Fetch invoices with outstanding amounts for payment allocation
              const { data: openInvoices, error: openInvError } = await supabase
                .from("invoices")
                .select(
                  "id, invoice_number, invoice_type, party_ledger_id, outstanding_amount",
                )
                .eq("company_id", companyId)
                .gt("outstanding_amount", 0)
                .order("invoice_date", { ascending: true });

              if (openInvError || !openInvoices || openInvoices.length === 0) {
                console.error("❌ No open invoices found for payments");
              } else {
                console.log(
                  `   Found ${openInvoices.length} invoices with outstanding amounts\n`,
                );

                const salesInvoicesForPayment = openInvoices.filter(
                  (inv) => inv.invoice_type === "sales",
                );
                const purchaseInvoicesForPayment = openInvoices.filter(
                  (inv) => inv.invoice_type === "purchase",
                );

                // Payment modes for variety
                const paymentModes = [
                  "cash",
                  "upi",
                  "neft",
                  "cheque",
                  "rtgs",
                  "card",
                ];

                // ================================================
                // RECEIPTS (against sales invoices)
                // ================================================
                const receiptData = [
                  // Fully settled
                  {
                    invoice: salesInvoicesForPayment[0],
                    percentage: 100,
                    mode: paymentModes[1],
                    reference: "UPI/123456789",
                  },
                  {
                    invoice: salesInvoicesForPayment[1],
                    percentage: 100,
                    mode: paymentModes[2],
                    reference: "NEFT/UTR987654321",
                  },
                  {
                    invoice: salesInvoicesForPayment[2],
                    percentage: 100,
                    mode: paymentModes[5],
                    reference: "CARD/AUTH456789",
                  },
                  // Partially paid
                  {
                    invoice: salesInvoicesForPayment[3],
                    percentage: 60,
                    mode: paymentModes[3],
                    reference: "CHQ/123456",
                  },
                  {
                    invoice: salesInvoicesForPayment[4],
                    percentage: 50,
                    mode: paymentModes[4],
                    reference: "RTGS/UTR111222333",
                  },
                  {
                    invoice: salesInvoicesForPayment[5],
                    percentage: 70,
                    mode: paymentModes[1],
                    reference: "UPI/987654321",
                  },
                  // Advance payment (no invoice)
                  {
                    invoice: null,
                    amount: 25000,
                    mode: paymentModes[0],
                    reference: "CASH-ADV",
                  },
                ];

                for (const receipt of receiptData) {
                  if (!receipt.invoice && !receipt.amount) {
                    continue;
                  }

                  const totalAmount = receipt.invoice
                    ? (receipt.invoice.outstanding_amount *
                        receipt.percentage) /
                      100
                    : receipt.amount;

                  const allocations = receipt.invoice
                    ? [
                        {
                          allocation_type: "against_ref",
                          invoice_id: receipt.invoice.id,
                          amount_applied: totalAmount,
                        },
                      ]
                    : [
                        {
                          allocation_type: "advance",
                          invoice_id: null,
                          amount_applied: totalAmount,
                        },
                      ];

                  const { data: paymentId, error: paymentError } =
                    await supabase.rpc("create_payment_with_allocations", {
                      p_voucher_type: "receipt",
                      p_party_ledger_id: receipt.invoice
                        ? receipt.invoice.party_ledger_id
                        : partnerLedgerMap.get(customerPartners[0].id)!,
                      p_counter_ledger_id: bankLedger.id,
                      p_tds_ledger_id: tcsReceivableLedger?.id || null,
                      p_payment_date: new Date().toISOString().split("T")[0],
                      p_payment_mode: receipt.mode,
                      p_reference_number: receipt.reference,
                      p_reference_date: new Date().toISOString().split("T")[0],
                      p_total_amount: totalAmount,
                      p_tds_applicable: false,
                      p_tds_rate: 0,
                      p_notes: receipt.invoice
                        ? `Receipt against ${receipt.invoice.invoice_number}`
                        : "Advance receipt",
                      p_attachments: [],
                      p_allocations: allocations,
                      p_company_id: companyId,
                    });

                  if (paymentError) {
                    console.error(
                      `   ❌ Failed to create receipt: ${paymentError.message}`,
                    );
                  } else {
                    // Fetch the payment number for logging
                    const { data: payment } = await supabase
                      .from("payments")
                      .select("payment_number")
                      .eq("id", paymentId)
                      .single();

                    console.log(
                      `   ✅ Created receipt: ${payment?.payment_number || paymentId} (₹${totalAmount.toFixed(2)})`,
                    );
                  }
                }

                // ================================================
                // PAYMENTS (against purchase invoices)
                // ================================================
                const vendorPaymentData = [
                  // Fully settled
                  {
                    invoice: purchaseInvoicesForPayment[0],
                    percentage: 100,
                    mode: paymentModes[2],
                    reference: "NEFT/UTR444555666",
                    tds: false,
                  },
                  {
                    invoice: purchaseInvoicesForPayment[1],
                    percentage: 100,
                    mode: paymentModes[4],
                    reference: "RTGS/UTR777888999",
                    tds: false,
                  },
                  {
                    invoice: purchaseInvoicesForPayment[2],
                    percentage: 100,
                    mode: paymentModes[3],
                    reference: "CHQ/654321",
                    tds: false,
                  },
                  // Partially paid
                  {
                    invoice: purchaseInvoicesForPayment[3],
                    percentage: 80,
                    mode: paymentModes[2],
                    reference: "NEFT/UTR101112131",
                    tds: false,
                  },
                  {
                    invoice: purchaseInvoicesForPayment[4],
                    percentage: 60,
                    mode: paymentModes[4],
                    reference: "RTGS/UTR141516171",
                    tds: false,
                  },
                  {
                    invoice: purchaseInvoicesForPayment[5],
                    percentage: 75,
                    mode: paymentModes[1],
                    reference: "UPI/181920212",
                    tds: false,
                  },
                  // With TDS
                  {
                    invoice: purchaseInvoicesForPayment[6],
                    percentage: 100,
                    mode: paymentModes[2],
                    reference: "NEFT/UTR222324252",
                    tds: true,
                    tds_rate: 1,
                  },
                  {
                    invoice: purchaseInvoicesForPayment[7],
                    percentage: 100,
                    mode: paymentModes[4],
                    reference: "RTGS/UTR262728293",
                    tds: true,
                    tds_rate: 2,
                  },
                  // Advance payment (no invoice)
                  {
                    invoice: null,
                    amount: 50000,
                    mode: paymentModes[2],
                    reference: "NEFT-ADV/303132333",
                    tds: false,
                  },
                ];

                for (const payment of vendorPaymentData) {
                  if (!payment.invoice && !payment.amount) {
                    continue;
                  }

                  const totalAmount = payment.invoice
                    ? (payment.invoice.outstanding_amount *
                        payment.percentage) /
                      100
                    : payment.amount;

                  // Calculate net amount after TDS deduction
                  const tdsAmount = payment.tds
                    ? totalAmount * ((payment.tds_rate || 0) / 100)
                    : 0;
                  const netAmount = totalAmount - tdsAmount;

                  const allocations = payment.invoice
                    ? [
                        {
                          allocation_type: "against_ref",
                          invoice_id: payment.invoice.id,
                          amount_applied: netAmount, // Use net amount for allocation
                        },
                      ]
                    : [
                        {
                          allocation_type: "advance",
                          invoice_id: null,
                          amount_applied: netAmount, // Use net amount for allocation
                        },
                      ];

                  const { data: paymentId, error: paymentError } =
                    await supabase.rpc("create_payment_with_allocations", {
                      p_voucher_type: "payment",
                      p_party_ledger_id: payment.invoice
                        ? payment.invoice.party_ledger_id
                        : partnerLedgerMap.get(supplierPartners[0].id)!,
                      p_counter_ledger_id: bankLedger.id,
                      p_tds_ledger_id: tdsPayableLedger?.id || null,
                      p_payment_date: new Date().toISOString().split("T")[0],
                      p_payment_mode: payment.mode,
                      p_reference_number: payment.reference,
                      p_reference_date: new Date().toISOString().split("T")[0],
                      p_total_amount: totalAmount,
                      p_tds_applicable: payment.tds || false,
                      p_tds_rate: payment.tds_rate || 0,
                      p_notes: payment.invoice
                        ? `Payment against ${payment.invoice.invoice_number}`
                        : "Advance payment to supplier",
                      p_attachments: [],
                      p_allocations: allocations,
                      p_company_id: companyId,
                    });

                  if (paymentError) {
                    console.error(
                      `   ❌ Failed to create payment: ${paymentError.message}`,
                    );
                  } else {
                    // Fetch the payment number for logging
                    const { data: pymnt } = await supabase
                      .from("payments")
                      .select("payment_number")
                      .eq("id", paymentId)
                      .single();

                    const tdsInfo = payment.tds
                      ? ` with ${payment.tds_rate}% TDS`
                      : "";
                    console.log(
                      `   ✅ Created payment: ${pymnt?.payment_number || paymentId} (₹${totalAmount.toFixed(2)}${tdsInfo})`,
                    );
                  }
                }

                console.log("\n✨ Payments created successfully!\n");
              }
            }
          }
        }
      }
    }
  }

  // Create invite for the test company
  console.log("\n🎟️  Creating admin invite for test company...");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

  const { data: adminToken, error: adminInviteError } = await supabase.rpc(
    "create_staff_invite",
    {
      p_all_warehouses_access: true,
      p_company_id: companyId,
      p_company_name: companyName,
      p_role: "admin",
      p_warehouse_ids: null, // Admin doesn't need warehouse assignment
      p_expires_at: expiresAt.toISOString(),
    },
  );

  if (adminInviteError || !adminToken) {
    console.error("❌ Error creating admin invite:", adminInviteError);
  } else {
    console.log(`✅ Admin invite created\n`);
  }

  // 6. Create staff invite
  console.log("🎟️  Creating staff invite for test company...");

  const { data: staffToken, error: staffInviteError } = await supabase.rpc(
    "create_staff_invite",
    {
      p_all_warehouses_access: false,
      p_company_id: companyId,
      p_company_name: companyName,
      p_role: "staff",
      p_warehouse_ids: [warehouseId], // Assign to main warehouse
      p_expires_at: expiresAt.toISOString(),
    },
  );

  if (staffInviteError || !staffToken) {
    console.error("❌ Error creating staff invite:", staffInviteError);
  } else {
    console.log(`✅ Staff invite created\n`);
  }

  // Print invite links
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🎉 Setup Complete!\n");
  console.log("📋 Test Company Details:");
  console.log(`   Company ID: ${companyId}`);
  console.log(`   Warehouse ID: ${warehouseId}\n`);
  console.log("🔗 Invite Links (valid for 7 days):\n");
  console.log("👤 Admin Invite:");
  console.log(`   ${appUrl}/invite/${adminToken}\n`);
  console.log("👷 Staff Invite:");
  console.log(`   ${appUrl}/invite/${staffToken}\n`);
  console.log(
    "💡 Use these invite links to create users for the test company with partners data\n",
  );
  console.log("🏪 Online store:");
  console.log(`   ${appUrl}/company/${companySlug}/store/products\n`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

createTestPartners().catch(console.error);
