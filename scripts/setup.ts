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
    },
    {
      company_id: companyId,
      partner_type: "customer",
      first_name: "Amit",
      last_name: "Patel",
      phone_number: "+91 98765 43212",
      address_line1: "789 Ashram Road",
      city: "Ahmedabad",
      state: "Gujarat",
      pin_code: "380009",
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
    },
    // Agents
    {
      company_id: companyId,
      partner_type: "agent",
      first_name: "Vikram",
      last_name: "Mehta",
      phone_number: "+91 98765 43217",
      email: "vikram.mehta@example.com",
      address_line1: "258 Transport Nagar",
      city: "Delhi",
      state: "Delhi",
      pin_code: "110001",
    },
    {
      company_id: companyId,
      partner_type: "agent",
      first_name: "Anjali",
      last_name: "Gupta",
      phone_number: "+91 98765 43218",
      address_line1: "369 Market Road",
      city: "Pune",
      state: "Maharashtra",
      pin_code: "411001",
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
        console.error(
          `   ❌ Failed to link attributes: ${linkError.message}`,
        );
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
          expected_delivery_date: new Date(
            twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          total_amount: 25000.0,
          advance_amount: 10000.0,
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
          expected_delivery_date: new Date(
            twoMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          total_amount: 18000.0,
          advance_amount: 9000.0,
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
          expected_delivery_date: new Date(
            twoMonthsAgo.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "cancelled",
          total_amount: 15000.0,
          advance_amount: 5000.0,
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
          expected_delivery_date: new Date(
            lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          total_amount: 32000.0,
          advance_amount: 16000.0,
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
          expected_delivery_date: new Date(
            lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0], // Overdue
          status: "in_progress",
          total_amount: 28000.0,
          advance_amount: 14000.0,
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
          expected_delivery_date: new Date(
            lastMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "completed",
          total_amount: 22000.0,
          advance_amount: 11000.0,
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
          expected_delivery_date: new Date(
            currentMonth.getTime() + 20 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          total_amount: 35000.0,
          advance_amount: 17500.0,
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
          expected_delivery_date: new Date(
            currentMonth.getTime() + 25 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "in_progress",
          total_amount: 42000.0,
          advance_amount: 21000.0,
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
          expected_delivery_date: new Date(
            currentMonth.getTime() - 2 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0], // Overdue
          status: "in_progress",
          total_amount: 19000.0,
          advance_amount: 9500.0,
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
          expected_delivery_date: new Date(
            currentMonth.getTime() + 30 * 24 * 60 * 60 * 1000,
          )
            .toISOString()
            .split("T")[0],
          status: "approval_pending",
          total_amount: 38000.0,
          advance_amount: 19000.0,
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
