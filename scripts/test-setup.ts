import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
});

async function createTestPartners() {
	console.log('🌱 Creating test data...\n');

	// Get or create company
	let companyId: string;
	let warehouseId: string;

	const { data: companies, error: companyError } = await supabase
		.from('companies')
		.select('id')
		.limit(1);

	if (companyError) {
		console.error('❌ Error fetching companies:', companyError);
		return;
	}

	if (!companies || companies.length === 0) {
		console.log('📦 Creating test company...');
		const { data: newCompany, error: createError } = await supabase
			.from('companies')
			.insert({
				name: 'Bale Test Company',
				gst_number: '27AABCT1234A1Z5',
				pan_number: 'AABCT1234A',
				business_type: 'Textile Manufacturing',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (createError || !newCompany) {
			console.error('❌ Failed to create company:', createError);
			return;
		}

		companyId = newCompany.id;
		console.log(`✅ Created company: ${companyId}\n`);

		// Create a test warehouse
		console.log('🏭 Creating test warehouse...');
		const { data: warehouse, error: warehouseError } = await supabase
			.from('warehouses')
			.insert({
				company_id: companyId,
				name: 'Main Warehouse',
				address_line1: '123 Test Street',
				city: 'Mumbai',
				state: 'Maharashtra',
				country: 'India',
				pin_code: '400001',
			})
			.select()
			.single();

		if (warehouseError || !warehouse) {
			console.error('❌ Failed to create warehouse:', warehouseError);
			return;
		}

		warehouseId = warehouse.id;
		console.log(`✅ Created warehouse: ${warehouseId}\n`);

		// Create a test admin user
		console.log('👤 Creating test admin user...');
		const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
			email: 'admin@baletest.com',
			password: 'testpassword123',
			email_confirm: true,
		});

		if (authError || !authUser.user) {
			console.error('❌ Failed to create auth user:', authError);
		} else {
			const { data: user, error: userError } = await supabase
				.from('users')
				.insert({
					auth_user_id: authUser.user.id,
					company_id: companyId,
					warehouse_id: warehouse.id,
					first_name: 'Admin',
					last_name: 'User',
					email: 'admin@baletest.com',
					role: 'admin',
				})
				.select()
				.single();

			if (userError) {
				console.error('❌ Failed to create user profile:', userError);
			} else {
				console.log(`✅ Created admin user: ${user.id}\n`);
			}
		}
	} else {
		companyId = companies[0].id;
		console.log(`📦 Using existing company: ${companyId}\n`);

		// Get existing warehouse
		const { data: warehouses, error: whError } = await supabase
			.from('warehouses')
			.select('id')
			.eq('company_id', companyId)
			.limit(1);

		if (whError || !warehouses || warehouses.length === 0) {
			console.error('❌ No warehouse found for company');
			return;
		}

		warehouseId = warehouses[0].id;
	}

	// Get a user to use as created_by
	const { data: users, error: userError } = await supabase
		.from('users')
		.select('id')
		.eq('company_id', companyId)
		.limit(1);

	if (userError || !users || users.length === 0) {
		console.error('❌ No users found for this company. Cannot create partners.');
		return;
	}

	const createdBy = users[0].id;
	console.log(`👤 Using user ${createdBy} as creator\n`);

	const testPartners = [
		// Customers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Rajesh',
			last_name: 'Kumar',
			company_name: 'Kumar Textiles',
			phone_number: '+91 98765 43210',
			email: 'rajesh@kumartextiles.com',
			address_line1: '123 MG Road',
			city: 'Mumbai',
			state: 'Maharashtra',
			pin_code: '400001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Priya',
			last_name: 'Sharma',
			company_name: 'Sharma Fabrics',
			phone_number: '+91 98765 43211',
			email: 'priya@sharmafabrics.com',
			address_line1: '456 Commercial Street',
			city: 'Bangalore',
			state: 'Karnataka',
			pin_code: '560001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'customer',
			first_name: 'Amit',
			last_name: 'Patel',
			phone_number: '+91 98765 43212',
			address_line1: '789 Ashram Road',
			city: 'Ahmedabad',
			state: 'Gujarat',
			pin_code: '380009',
		},
		// Suppliers
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Suresh',
			last_name: 'Reddy',
			company_name: 'Reddy Cotton Mills',
			phone_number: '+91 98765 43213',
			email: 'suresh@reddycotton.com',
			address_line1: '321 Industrial Area',
			city: 'Coimbatore',
			state: 'Tamil Nadu',
			pin_code: '641001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'supplier',
			first_name: 'Lakshmi',
			last_name: 'Naidu',
			company_name: 'Naidu Silk House',
			phone_number: '+91 98765 43214',
			address_line1: '654 Silk Market',
			city: 'Kanchipuram',
			state: 'Tamil Nadu',
			pin_code: '631502',
		},
		// Vendors
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Arjun',
			last_name: 'singh',
			company_name: 'Singh Processing Unit',
			phone_number: '+91 98765 43215',
			email: 'arjun@singhprocessing.com',
			address_line1: '987 Factory Lane',
			city: 'Ludhiana',
			state: 'Punjab',
			pin_code: '141001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'vendor',
			first_name: 'Meera',
			last_name: 'Desai',
			company_name: 'Desai Dyeing Works',
			phone_number: '+91 98765 43216',
			address_line1: '147 Textile Park',
			city: 'Surat',
			state: 'Gujarat',
			pin_code: '395003',
		},
		// Agents
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Vikram',
			last_name: 'Mehta',
			phone_number: '+91 98765 43217',
			email: 'vikram.mehta@example.com',
			address_line1: '258 Transport Nagar',
			city: 'Delhi',
			state: 'Delhi',
			pin_code: '110001',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			partner_type: 'agent',
			first_name: 'Anjali',
			last_name: 'Gupta',
			phone_number: '+91 98765 43218',
			address_line1: '369 Market Road',
			city: 'Pune',
			state: 'Maharashtra',
			pin_code: '411001',
		},
	];

	for (const partner of testPartners) {
		const { data, error } = await supabase
			.from('partners')
			.insert(partner)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create partner: ${partner.first_name} ${partner.last_name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(
				`✅ Created ${partner.partner_type}: ${partner.first_name} ${partner.last_name} ${partner.company_name ? `(${partner.company_name})` : ''
				}`
			);
		}
	}

	console.log('\n✨ Test partners created successfully!');

	// Create test products
	console.log('\n📦 Creating test products...\n');

	const testProducts = [
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Premium Silk Saree',
			product_number: 'PROD-001',
			material: 'Silk',
			color: 'Red',
			gsm: 120,
			thread_count_cm: 80,
			tags: ['premium', 'wedding', 'traditional'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 2500.00,
			selling_price_per_unit: 3500.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 10,
			hsn_code: '5007',
			notes: 'Premium quality silk saree with golden border',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Kurta Fabric',
			product_number: 'PROD-002',
			material: 'Cotton',
			color: 'White',
			gsm: 150,
			thread_count_cm: 60,
			tags: ['summer', 'breathable', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 450.00,
			selling_price_per_unit: 650.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 50,
			hsn_code: '5208',
			notes: 'Pure cotton fabric ideal for summer kurtas',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Woolen Shawl Material',
			product_number: 'PROD-003',
			material: 'Wool',
			color: 'Black',
			gsm: 200,
			thread_count_cm: 50,
			tags: ['winter', 'warm', 'premium'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 1800.00,
			selling_price_per_unit: 2500.00,
			show_on_catalog: true,
			min_stock_alert: false,
			hsn_code: '5111',
			notes: 'High-quality woolen fabric for shawls',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Polyester Blend Dress Material',
			product_number: 'PROD-004',
			material: 'Polyester',
			color: 'Blue',
			gsm: 180,
			thread_count_cm: 70,
			tags: ['modern', 'formal', 'wrinkle-free'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 350.00,
			selling_price_per_unit: 550.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 30,
			hsn_code: '5407',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Linen Summer Fabric',
			product_number: 'PROD-005',
			material: 'Linen',
			color: 'White',
			gsm: 140,
			thread_count_cm: 55,
			tags: ['summer', 'eco-friendly', 'breathable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 800.00,
			selling_price_per_unit: 1200.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 20,
			hsn_code: '5309',
			notes: 'Eco-friendly linen fabric for summer wear',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Designer Silk Fabric',
			product_number: 'PROD-006',
			material: 'Silk',
			color: 'Green',
			gsm: 110,
			thread_count_cm: 75,
			tags: ['designer', 'luxury', 'festive'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 3000.00,
			selling_price_per_unit: 4200.00,
			show_on_catalog: false,
			min_stock_alert: false,
			hsn_code: '5007',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Cotton Denim',
			product_number: 'PROD-007',
			material: 'Denim',
			color: 'Blue',
			gsm: 300,
			thread_count_cm: 40,
			tags: ['denim', 'casual', 'durable'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 600.00,
			selling_price_per_unit: 900.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 40,
			hsn_code: '5209',
			notes: 'Heavy-duty cotton denim fabric',
		},
		{
			company_id: companyId,
			created_by: createdBy,
			name: 'Yellow Cotton Print',
			product_number: 'PROD-008',
			material: 'Cotton',
			color: 'Yellow',
			gsm: 130,
			thread_count_cm: 65,
			tags: ['printed', 'colorful', 'casual'],
			measuring_unit: 'Meters',
			cost_price_per_unit: 400.00,
			selling_price_per_unit: 600.00,
			show_on_catalog: true,
			min_stock_alert: true,
			min_stock_threshold: 25,
			hsn_code: '5208',
		},
	];

	for (const product of testProducts) {
		const { data, error } = await supabase
			.from('products')
			.insert(product)
			.select()
			.single();

		if (error) {
			console.error(`❌ Failed to create product: ${product.name}`);
			console.error(`   Error: ${error.message}`);
		} else {
			console.log(`✅ Created product: ${product.name} (${product.product_number})`);
		}
	}

	console.log('\n✨ Test products created successfully!');

	// Note: Goods inwards and outwards creation removed
	// In the new design, users create stock units directly during goods inward
	// with complete details (size, quality, location, etc.)
	console.log('\n⏭️  Skipping goods inwards/outwards (users create stock units directly)\n');

	// Get partner IDs for use in inwards and outwards
	const { data: supplierPartners, error: supplierError } = await supabase
		.from('partners')
		.select('id')
		.eq('company_id', companyId)
		.eq('partner_type', 'supplier')
		.limit(2);

	const { data: customerPartners, error: customerError } = await supabase
		.from('partners')
		.select('id')
		.eq('company_id', companyId)
		.eq('partner_type', 'customer')
		.limit(2);

	if (supplierError || !supplierPartners || supplierPartners.length === 0) {
		console.error('❌ No suppliers found for creating inwards');
	} else if (customerError || !customerPartners || customerPartners.length === 0) {
		console.error('❌ No customers found for creating outwards');
	} else {
		const supplierId1 = supplierPartners[0].id;
		const supplierId2 = supplierPartners.length > 1 ? supplierPartners[1].id : supplierId1;
		const customerId1 = customerPartners[0].id;
		const customerId2 = customerPartners.length > 1 ? customerPartners[1].id : customerId1;

		// Get product IDs
		const { data: productsList, error: productsError } = await supabase
			.from('products')
			.select('id')
			.eq('company_id', companyId)
			.limit(5);

		if (productsError || !productsList || productsList.length === 0) {
			console.error('❌ No products found for creating inwards/outwards');
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
					created_by: createdBy,
					inward_number: 'GR-001',
					inward_type: 'other',
					other_reason: 'Purchase',
					partner_id: supplierId1,
					inward_date: month3.toISOString().split('T')[0],
					invoice_number: 'INV-2024-001',
					invoice_amount: 15000.00,
					notes: 'Received silk fabrics from supplier',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					inward_number: 'GR-002',
					inward_type: 'other',
					other_reason: 'Purchase',
					partner_id: supplierId2,
					inward_date: month3.toISOString().split('T')[0],
					invoice_number: 'INV-2024-002',
					invoice_amount: 8500.00,
					notes: 'Cotton fabric purchase',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					inward_number: 'GR-003',
					inward_type: 'other',
					other_reason: 'Purchase',
					partner_id: supplierId1,
					inward_date: month2.toISOString().split('T')[0],
					invoice_number: 'INV-2024-003',
					invoice_amount: 22000.00,
					notes: 'Premium woolen fabrics received',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					inward_number: 'GR-004',
					inward_type: 'other',
					other_reason: 'Purchase',
					partner_id: supplierId2,
					inward_date: month2.toISOString().split('T')[0],
					invoice_number: 'INV-2024-004',
					invoice_amount: 12000.00,
					notes: 'Polyester blend materials',
				},
				{
					company_id: companyId,
					warehouse_id: warehouseId,
					created_by: createdBy,
					inward_number: 'GR-005',
					inward_type: 'other',
					other_reason: 'Purchase',
					partner_id: supplierId1,
					inward_date: month1.toISOString().split('T')[0],
					invoice_number: 'INV-2024-005',
					invoice_amount: 18500.00,
					notes: 'Linen fabric stock replenishment',
				},
			];

			const inwardIds: string[] = [];

			for (const inwards of testInwards) {
				// Check if inwards already exists
				const { data: existingInward } = await supabase
					.from('goods_inwards')
					.select('id, inward_number')
					.eq('company_id', companyId)
					.eq('inward_number', inwards.inward_number)
					.single();

				let inwardId: string;

				if (existingInward) {
					console.log(`⏭️  Inward ${inwards.inward_number} already exists`);
					inwardId = existingInward.id;
					inwardIds.push(inwardId);
				} else {
					const { data, error } = await supabase
						.from('goods_inwards')
						.insert(inwards)
						.select()
						.single();

					if (error) {
						console.error(`❌ Failed to create inwards: ${inwards.inward_number}`);
						console.error(`   Error: ${error.message}`);
						continue;
					} else {
						inwardId = data.id;
						inwardIds.push(inwardId);
						console.log(`✅ Created goods inwards: ${inwards.inward_number}`);
					}
				}

				// Check if stock units already exist for this inwards
				const { data: existingStockUnits, error: checkStockError } = await supabase
					.from('stock_units')
					.select('id')
					.eq('created_from_inward_id', inwardId);

				if (checkStockError) {
					console.error(`   ❌ Failed to check existing stock units: ${checkStockError.message}`);
					continue;
				}

				if (existingStockUnits && existingStockUnits.length > 0) {
					console.log(`   ⏭️  Stock units already exist (${existingStockUnits.length} units)`);
					continue;
				}

				// Create stock units directly (2-3 products per inwards)
				const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 items
				for (let i = 0; i < itemCount && i < productsList.length; i++) {
					const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 units per product

					// Create stock units for each quantity
					for (let j = 0; j < quantity; j++) {
						const initial_quantity = (Math.random() * 50 + 10).toFixed(2); // Random size 10-60
						const { error: stockError } = await supabase
							.from('stock_units')
							.insert({
								company_id: companyId,
								warehouse_id: warehouseId,
								product_id: productsList[i].id,
								created_from_inward_id: inwardId,
								created_by: createdBy,
								initial_quantity,
								remaining_quantity: initial_quantity,
								quality_grade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)],
								location_description: `Rack ${String.fromCharCode(65 + Math.floor(Math.random() * 5))}-${Math.floor(Math.random() * 10) + 1}`,
								status: 'in_stock',
								manufacturing_date: inwards.inward_date,
							});

						if (stockError) {
							console.error(`   ❌ Failed to create stock unit: ${stockError.message}`);
						} else {
							console.log(`   ✅ Created stock unit ${j + 1}/${quantity} for product ${i + 1}`);
						}
					}
				}
			}

			// Get stock units that were auto-created from inwards
			const { data: stockUnits, error: stockError } = await supabase
				.from('stock_units')
				.select('id')
				.eq('company_id', companyId)
				.eq('status', 'in_stock')
				.limit(15);

			if (stockError || !stockUnits || stockUnits.length === 0) {
				console.error('❌ No stock units available for creating outwards');
			} else {
				// Create 5 goods outwards
				const testOutwards = [
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						outward_number: 'GD-001',
						partner_id: customerId1,
						outward_type: 'other',
						other_reason: 'Sample outward for exhibition',
						outward_date: month3.toISOString().split('T')[0],
						invoice_number: 'DISP-001',
						invoice_amount: 5000.00,
						notes: 'Sample fabrics sent for trade show',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						outward_number: 'GD-002',
						partner_id: customerId2,
						outward_type: 'other',
						other_reason: 'Quality testing at external lab',
						outward_date: month3.toISOString().split('T')[0],
						invoice_number: 'DISP-002',
						notes: 'Silk samples for quality verification',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						outward_number: 'GD-003',
						partner_id: customerId1,
						outward_type: 'other',
						other_reason: 'Customer sample approval',
						outward_date: month2.toISOString().split('T')[0],
						invoice_number: 'DISP-003',
						invoice_amount: 3500.00,
						notes: 'Cotton fabric samples for customer review',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						outward_number: 'GD-004',
						partner_id: customerId2,
						outward_type: 'other',
						other_reason: 'Marketing material outward',
						outward_date: month2.toISOString().split('T')[0],
						invoice_number: 'DISP-004',
						notes: 'Product samples for marketing campaign',
					},
					{
						company_id: companyId,
						warehouse_id: warehouseId,
						created_by: createdBy,
						outward_number: 'GD-005',
						partner_id: customerId1,
						outward_type: 'other',
						other_reason: 'Demo pieces for new collection',
						outward_date: month1.toISOString().split('T')[0],
						invoice_number: 'DISP-005',
						invoice_amount: 7500.00,
						notes: 'New season collection samples',
					},
				];

				let stockUnitIndex = 0;

				for (const outward of testOutwards) {
					// Check if outward already exists
					const { data: existingOutward } = await supabase
						.from('goods_outwards')
						.select('id, outward_number')
						.eq('company_id', companyId)
						.eq('outward_number', outward.outward_number)
						.single();

					if (existingOutward) {
						console.log(`⏭️  Outward ${outward.outward_number} already exists`);
						stockUnitIndex += 3; // Skip stock units that would have been used
						continue;
					}

					// Prepare stock unit items (1-3 stock units per outward)
					const itemCount = Math.min(3, stockUnits.length - stockUnitIndex);
					const stockUnitItems = [];

					for (let i = 0; i < itemCount && stockUnitIndex < stockUnits.length; i++) {
						// Get stock unit details to determine quantity to dispatch
						const { data: stockUnit } = await supabase
							.from('stock_units')
							.select('remaining_quantity')
							.eq('id', stockUnits[stockUnitIndex].id)
							.single();

						const dispatchQty = stockUnit?.remaining_quantity || 0;

						stockUnitItems.push({
							stock_unit_id: stockUnits[stockUnitIndex].id,
							quantity: dispatchQty, // Dispatch full quantity
						});

						stockUnitIndex++;
					}

					if (stockUnitItems.length === 0) {
						console.log(`⏭️  No stock units available for ${outward.outward_number}`);
						continue;
					}

					// Use the atomic function to create outward with items
					const { data, error } = await supabase.rpc('create_goods_outward_with_items', {
						p_outward_data: outward,
						p_stock_unit_items: stockUnitItems,
					});

					if (error) {
						console.error(`❌ Failed to create outward: ${outward.outward_number}`);
						console.error(`   Error: ${error.message}`);
					} else {
						console.log(`✅ Created goods outward: ${outward.outward_number} with ${stockUnitItems.length} items`);
					}
				}
			}

			console.log('\n✨ Test goods inwards and outwards created successfully!');
		}
	}

	// Create sales orders
	console.log('\n📋 Creating test sales orders...\n');

	if (customerError || !customerPartners || customerPartners.length === 0) {
		console.error('❌ No customers found for creating sales orders');
	} else {
		const customerId1 = customerPartners[0].id;
		const customerId2 = customerPartners.length > 1 ? customerPartners[1].id : customerId1;

		// Get product IDs
		const { data: productsList, error: productsError } = await supabase
			.from('products')
			.select('id, name')
			.eq('company_id', companyId)
			.limit(8);

		if (productsError || !productsList || productsList.length === 0) {
			console.error('❌ No products found for creating sales orders');
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
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId1,
					order_number: 'SO-001',
					order_date: twoMonthsAgo.toISOString().split('T')[0],
					expected_delivery_date: new Date(twoMonthsAgo.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'completed',
					total_amount: 25000.00,
					advance_amount: 10000.00,
					discount_percentage: 5,
					notes: 'Bulk order for wedding season',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId2,
					order_number: 'SO-002',
					order_date: new Date(twoMonthsAgo.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(twoMonthsAgo.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'completed',
					total_amount: 18000.00,
					advance_amount: 9000.00,
					discount_percentage: 10,
					notes: 'Regular customer order',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId1,
					order_number: 'SO-003',
					order_date: new Date(twoMonthsAgo.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(twoMonthsAgo.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'cancelled',
					total_amount: 15000.00,
					advance_amount: 5000.00,
					discount_percentage: 0,
					notes: 'Cancelled due to design changes',
				},

				// Last month - mix of statuses
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId2,
					order_number: 'SO-004',
					order_date: lastMonth.toISOString().split('T')[0],
					expected_delivery_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'completed',
					total_amount: 32000.00,
					advance_amount: 16000.00,
					discount_percentage: 8,
					notes: 'Premium silk order',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId1,
					order_number: 'SO-005',
					order_date: new Date(lastMonth.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(lastMonth.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Overdue
					status: 'in_progress',
					total_amount: 28000.00,
					advance_amount: 14000.00,
					discount_percentage: 5,
					notes: 'Delayed due to material shortage',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId2,
					order_number: 'SO-006',
					order_date: new Date(lastMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(lastMonth.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'completed',
					total_amount: 22000.00,
					advance_amount: 11000.00,
					discount_percentage: 12,
					notes: 'Festive collection order',
				},

				// Current month - mostly pending/in progress
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId1,
					order_number: 'SO-007',
					order_date: currentMonth.toISOString().split('T')[0],
					expected_delivery_date: new Date(currentMonth.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'approval_pending',
					total_amount: 35000.00,
					advance_amount: 17500.00,
					discount_percentage: 7,
					notes: 'Awaiting customer approval on design',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId2,
					order_number: 'SO-008',
					order_date: new Date(currentMonth.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(currentMonth.getTime() + 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'in_progress',
					total_amount: 42000.00,
					advance_amount: 21000.00,
					discount_percentage: 10,
					notes: 'Large order in production',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId1,
					order_number: 'SO-009',
					order_date: new Date(currentMonth.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(currentMonth.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Overdue
					status: 'in_progress',
					total_amount: 19000.00,
					advance_amount: 9500.00,
					discount_percentage: 5,
					notes: 'Rush order - overdue',
				},
				{
					company_id: companyId,
					created_by: createdBy,
					fulfillment_warehouse_id: warehouseId,
					customer_id: customerId2,
					order_number: 'SO-010',
					order_date: new Date(currentMonth.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					expected_delivery_date: new Date(currentMonth.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
					status: 'approval_pending',
					total_amount: 38000.00,
					advance_amount: 19000.00,
					discount_percentage: 15,
					notes: 'New customer - premium discount',
				},
			];

			for (const order of testSalesOrders) {
				// Check if order already exists
				const { data: existingOrder } = await supabase
					.from('sales_orders')
					.select('id, order_number')
					.eq('company_id', companyId)
					.eq('order_number', order.order_number)
					.single();

				let orderId: string;

				if (existingOrder) {
					console.log(`⏭️  Sales order ${order.order_number} already exists`);
					orderId = existingOrder.id;
				} else {
					const { data, error } = await supabase
						.from('sales_orders')
						.insert(order)
						.select()
						.single();

					if (error) {
						console.error(`❌ Failed to create sales order: ${order.order_number}`);
						console.error(`   Error: ${error.message}`);
						continue;
					} else {
						orderId = data.id;
						console.log(`✅ Created sales order: ${order.order_number} (${order.status})`);
					}
				}

				// Check if order items already exist
				const { data: existingItems, error: checkItemsError } = await supabase
					.from('sales_order_items')
					.select('id')
					.eq('sales_order_id', orderId);

				if (checkItemsError) {
					console.error(`   ❌ Failed to check existing items: ${checkItemsError.message}`);
					continue;
				}

				if (existingItems && existingItems.length > 0) {
					console.log(`   ⏭️  Order items already exist (${existingItems.length} items)`);
					continue;
				}

				// Create order items (2-4 products per order)
				const itemCount = Math.floor(Math.random() * 3) + 2; // 2-4 items
				for (let i = 0; i < itemCount && i < productsList.length; i++) {
					const requiredQty = Math.floor(Math.random() * 20) + 5; // 5-25 units
					const dispatchedQty = order.status === 'completed'
						? requiredQty
						: order.status === 'cancelled'
							? 0
							: Math.floor(requiredQty * (Math.random() * 0.5 + 0.3)); // 30-80% dispatched

					const { error: itemError } = await supabase
						.from('sales_order_items')
						.insert({
							company_id: companyId,
							sales_order_id: orderId,
							product_id: productsList[i].id,
							required_quantity: requiredQty,
							dispatched_quantity: dispatchedQty,
							notes: `${productsList[i].name} - ${requiredQty} units`,
						});

					if (itemError) {
						console.error(`   ❌ Failed to create order item: ${itemError.message}`);
					} else {
						console.log(`   ✅ Added item: ${productsList[i].name} (${dispatchedQty}/${requiredQty} dispatched)`);
					}
				}
			}

			console.log('\n✨ Test sales orders created successfully!');
		}
	}

	// Create QR code batches
	console.log('\n📱 Creating test QR code batches...\n');

	// Get some stock units to use in batches
	const { data: availableStockUnits, error: stockUnitsError } = await supabase
		.from('stock_units')
		.select('id')
		.eq('company_id', companyId)
		.eq('warehouse_id', warehouseId)
		.eq('status', 'in_stock')
		.limit(20);

	if (stockUnitsError || !availableStockUnits || availableStockUnits.length === 0) {
		console.error('❌ No stock units found for creating QR batches');
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
				created_by: createdBy,
				batch_name: 'Silk Saree Collection - Jan 2025',
				fields_selected: ['product_name', 'quality_grade', 'location', 'qr_code'],
				pdf_url: null, // Would be generated when batch is actually created
				image_url: null,
				created_at: month3.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'Cotton Fabric Batch #2',
				fields_selected: ['product_name', 'size', 'quality_grade', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month3.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'Premium Woolen Stock',
				fields_selected: ['product_name', 'quality_grade', 'supplier_number', 'location', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month2.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'New Arrivals - March',
				fields_selected: ['product_name', 'color', 'size', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month2.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'Export Ready Stock',
				fields_selected: ['product_name', 'quality_grade', 'location', 'manufacturing_date', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month2.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'Warehouse Audit Batch',
				fields_selected: ['product_name', 'size', 'location', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month1.toISOString(),
			},
			{
				company_id: companyId,
				warehouse_id: warehouseId,
				created_by: createdBy,
				batch_name: 'Festival Collection QRs',
				fields_selected: ['product_name', 'color', 'quality_grade', 'qr_code'],
				pdf_url: null,
				image_url: null,
				created_at: month1.toISOString(),
			},
		];

		let stockUnitIndex = 0;

		for (const batch of testBatches) {
			// Check if batch already exists
			const { data: existingBatch } = await supabase
				.from('barcode_batches')
				.select('id, batch_name')
				.eq('company_id', companyId)
				.eq('batch_name', batch.batch_name)
				.single();

			let batchId: string;

			if (existingBatch) {
				console.log(`⏭️  Batch "${batch.batch_name}" already exists`);
				batchId = existingBatch.id;
			} else {
				const { data, error } = await supabase
					.from('barcode_batches')
					.insert(batch)
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
				.from('barcode_batch_items')
				.select('id')
				.eq('batch_id', batchId);

			if (checkItemsError) {
				console.error(`   ❌ Failed to check existing items: ${checkItemsError.message}`);
				continue;
			}

			if (existingItems && existingItems.length > 0) {
				console.log(`   ⏭️  Batch items already exist (${existingItems.length} items)`);
				stockUnitIndex += existingItems.length;
				continue;
			}

			// Add stock units to batch (3-5 units per batch)
			const itemCount = Math.min(
				Math.floor(Math.random() * 3) + 3, // 3-5 items
				availableStockUnits.length - stockUnitIndex
			);

			for (let i = 0; i < itemCount && stockUnitIndex < availableStockUnits.length; i++) {
				const { error: itemError } = await supabase
					.from('barcode_batch_items')
					.insert({
						batch_id: batchId,
						stock_unit_id: availableStockUnits[stockUnitIndex].id,
					});

				if (itemError) {
					console.error(`   ❌ Failed to add item to batch: ${itemError.message}`);
				} else {
					console.log(`   ✅ Added item ${i + 1}/${itemCount} to batch`);
				}

				stockUnitIndex++;
			}
		}

		console.log('\n✨ Test QR code batches created successfully!');
	}

	// Create invite for the test company
	console.log('\n🎟️  Creating admin invite for test company...');
	const adminToken = randomBytes(32).toString('hex');
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

	const { data: adminInvite, error: adminInviteError } = await supabase
		.from('invites')
		.insert({
			token: adminToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'admin',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (adminInviteError) {
		console.error('❌ Error creating admin invite:', adminInviteError);
	} else {
		console.log(`✅ Admin invite created\n`);
	}

	// 6. Create staff invite
	console.log('🎟️  Creating staff invite for test company...');
	const staffToken = randomBytes(32).toString('hex');

	const { data: staffInvite, error: staffInviteError } = await supabase
		.from('invites')
		.insert({
			token: staffToken,
			company_id: companyId,
			warehouse_id: warehouseId,
			role: 'staff',
			expires_at: expiresAt.toISOString(),
		})
		.select()
		.single();

	if (staffInviteError) {
		console.error('❌ Error creating staff invite:', staffInviteError);
	} else {
		console.log(`✅ Staff invite created\n`);
	}

	// Print invite links
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
	console.log('🎉 Setup Complete!\n');
	console.log('📋 Test Company Details:');
	console.log(`   Company ID: ${companyId}`);
	console.log(`   Warehouse ID: ${warehouseId}\n`);
	console.log('🔗 Invite Links (valid for 7 days):\n');
	console.log('👤 Admin Invite:');
	console.log(`   http://localhost:3000/invite/${adminToken}\n`);
	console.log('👷 Staff Invite:');
	console.log(`   http://localhost:3000/invite/${staffToken}\n`);
	console.log('💡 Use these invite links to create users for the test company with partners data');
	console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

createTestPartners().catch(console.error);
