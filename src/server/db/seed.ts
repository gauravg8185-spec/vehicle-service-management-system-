import { getDb } from './connection';

function addDaysISO(baseDate: Date, deltaDays: number): string {
  const copy = new Date(baseDate.getTime());
  copy.setDate(copy.getDate() + deltaDays);
  return copy.toISOString().slice(0, 10);
}

export function seedDatabaseIfEmpty(): void {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  if (row.count > 0) {
    return;
  }

  const today = new Date();
  const todayStr = addDaysISO(today, 0);
  const yesterdayStr = addDaysISO(today, -1);
  const threeDaysAgoStr = addDaysISO(today, -3);
  const twoWeeksAgoStr = addDaysISO(today, -14);
  const fortyDaysAgoStr = addDaysISO(today, -40);
  const ninetyDaysAgoStr = addDaysISO(today, -90);
  const tomorrowStr = addDaysISO(today, 1);
  const threeDaysAheadStr = addDaysISO(today, 3);
  const fiveDaysAheadStr = addDaysISO(today, 5);
  const tenDaysAheadStr = addDaysISO(today, 10);
  const twentyDaysAheadStr = addDaysISO(today, 20);
  const fourDaysAgoDueStr = addDaysISO(today, -4);

  const seedTx = db.transaction(() => {
    const insertCustomer = db.prepare(`
      INSERT INTO customers (name, company_name, email, phone, address, account_type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const c1 = insertCustomer.run(
      'Rajesh Kulkarni',
      'Sahyadri Cold Chain Logistics Pvt. Ltd.',
      'fleet@sahyadricold.in',
      '+91 98204 51820',
      'Plot 42, Chakan MIDC Phase II, Pune, MH 410501',
      'Commercial Fleet'
    ).lastInsertRowid;

    const c2 = insertCustomer.run(
      'Ananya Deshmukh',
      'Deccan Parcel & Express Cargo',
      'dispatch@deccanparcel.in',
      '+91 98452 73190',
      '18 Peenya Industrial Area, Bengaluru, KA 560058',
      'Logistics Partner'
    ).lastInsertRowid;

    const c3 = insertCustomer.run(
      'Vikramaditya Singh',
      'Aravalli Field Engineering Services',
      'ops@aravallifield.co.in',
      '+91 98114 60285',
      'Sector 18, IMT Manesar, Gurugram, HR 122051',
      'Commercial Fleet'
    ).lastInsertRowid;

    const c4 = insertCustomer.run(
      'Meera Krishnan',
      'Independent Fleet Owner',
      'meera.krishnan@fastroute.in',
      '+91 98840 31942',
      '45 Guindy Industrial Estate, Chennai, TN 600032',
      'Individual'
    ).lastInsertRowid;

    const insertVehicle = db.prepare(`
      INSERT INTO vehicles (
        customer_id, vin, license_plate, make, model, year,
        vehicle_type, fuel_type, odometer_km, status, last_service_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const v1 = insertVehicle.run(
      c1, 'MAT445021N2A48219', 'MH-14-FC-4021', 'Tata', 'Ace Gold Diesel+', 2023,
      'Van', 'Diesel', 64850, 'Maintenance Due', ninetyDaysAgoStr
    ).lastInsertRowid;

    const v2 = insertVehicle.run(
      c1, 'MB1AA22E5NDNJ7740', 'MH-14-FC-4028', 'Ashok Leyland', 'Dost+ XL Reefer', 2022,
      'Box Truck', 'Diesel', 142300, 'In Service', yesterdayStr
    ).lastInsertRowid;

    const v3 = insertVehicle.run(
      c2, 'MA1ZN2GH8KP119034', 'KA-01-DP-8812', 'Mahindra', 'Bolero Pik-Up ExtraLong', 2024,
      'Pickup', 'Diesel', 38400, 'Active', twoWeeksAgoStr
    ).lastInsertRowid;

    const v4 = insertVehicle.run(
      c2, 'MC1CD4F75PF204918', 'KA-01-DP-8819', 'Force', 'Traveller 3350 Cargo', 2023,
      'Van', 'Diesel', 89120, 'Maintenance Due', fortyDaysAgoStr
    ).lastInsertRowid;

    const v5 = insertVehicle.run(
      c3, 'MA1TA2MK9PFA90123', 'HR-26-SF-3105', 'Mahindra', 'Scorpio-N Z8L 4WD', 2024,
      'SUV', 'Diesel', 29750, 'Active', threeDaysAgoStr
    ).lastInsertRowid;

    const v6 = insertVehicle.run(
      c4, 'MAT634015PF512087', 'TN-09-MK-7731', 'Tata', 'Nexon EV Max', 2023,
      'SUV', 'Electric', 51200, 'Active', twoWeeksAgoStr
    ).lastInsertRowid;

    const insertSchedule = db.prepare(`
      INSERT INTO maintenance_schedules (
        vehicle_id, task_name, interval_km, interval_days,
        last_completed_km, last_completed_date, next_due_km, next_due_date,
        priority, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertSchedule.run(
      v1, 'Engine Oil & Filter + 40-Point Monsoon Check', 10000, 180,
      54000, addDaysISO(today, -184), 64000, fourDaysAgoDueStr,
      'High', 'Operating high-density Pune–Mumbai expressway deliveries.'
    );
    insertSchedule.run(
      v4, 'Front & Rear Brake Liner / Drum Inspection', 20000, 180,
      70000, addDaysISO(today, -165), 90000, tenDaysAheadStr,
      'Critical', 'Driver reported slight pedal vibration under full parcel load.'
    );
    insertSchedule.run(
      v2, 'BS6 DPF Regeneration & Diesel Water Separator', 25000, 180,
      118000, addDaysISO(today, -175), 143000, fiveDaysAheadStr,
      'High', 'Coordinate with cold-chain reefer condenser cleaning.'
    );
    insertSchedule.run(
      v3, '15,000 km Tyre Rotation & Wheel Alignment', 15000, 120,
      30000, twoWeeksAgoStr, 45000, twentyDaysAheadStr,
      'Standard', 'Check leaf-spring shackles and TPMS.'
    );
    insertSchedule.run(
      v5, 'BS6 AdBlue DEF Top-Up & Coolant Check', 20000, 365,
      15000, addDaysISO(today, -120), 35000, addDaysISO(today, 45),
      'Standard', 'Scheduled preventive site-vehicle inspection.'
    );
    insertSchedule.run(
      v6, 'HV Battery Thermal Loop & Cabin HEPA Filter', 25000, 365,
      30000, addDaysISO(today, -110), 55000, addDaysISO(today, 30),
      'Standard', 'EV high-voltage harness insulation test included.'
    );

    const insertAppt = db.prepare(`
      INSERT INTO service_appointments (
        vehicle_id, customer_id, appointment_date, time_slot,
        service_type, bay_number, assigned_technician, priority, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const a1 = insertAppt.run(
      v2, c1, todayStr, '09:00 AM',
      'Reefer Compressor & BS6 DPF Service', 'Bay 2', 'Ramesh Yadav', 'Urgent', 'In Bay',
      'Vehicle checked in at 08:45 AM; compressor belt tensioner replacement underway.'
    ).lastInsertRowid;

    insertAppt.run(
      v1, c1, todayStr, '11:00 AM',
      '10,000 km Preventive Oil & Filter Service', 'Bay 1', 'Suresh Patel', 'Standard', 'Scheduled',
      'Driver waiting at reception; perform battery load test.'
    );

    insertAppt.run(
      v4, c2, tomorrowStr, '10:00 AM',
      'Brake Liner Overhaul & Drum Skimming', 'Bay 3', 'Ramesh Yadav', 'Urgent', 'Scheduled',
      'OEM brake kit staged at parts counter B4.'
    );

    insertAppt.run(
      v3, c2, threeDaysAheadStr, '02:00 PM',
      'Tyre Rotation & Alignment Check', 'Bay 1', 'Karthik Iyer', 'Standard', 'Scheduled',
      'Needs release before 05:00 PM evening courier dispatch.'
    );

    const a5 = insertAppt.run(
      v5, c3, threeDaysAgoStr, '10:00 AM',
      '30k Periodic Service & DEF Refill', 'Bay 4', 'Karthik Iyer', 'Standard', 'Completed',
      'Delivered on schedule.'
    ).lastInsertRowid;

    const insertRepair = db.prepare(`
      INSERT INTO repair_records (
        vehicle_id, appointment_id, service_date, odometer_at_service,
        service_category, title, description, technician,
        labor_hours, labor_rate, parts_cost, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertLineItem = db.prepare(`
      INSERT INTO repair_line_items (
        repair_id, item_type, description, quantity, unit_price, line_total
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    const r1 = insertRepair.run(
      v5, a5, threeDaysAgoStr, 29750,
      'Preventive Maintenance',
      '30,000 km Periodic Service & BS6 AdBlue Refill',
      'Replaced 15W-40 synthetic diesel oil, OEM oil & air filters, topped up 10L DEF AdBlue, and balanced front wheels.',
      'Karthik Iyer', 2.0, 850, 4650.00, 'Completed'
    ).lastInsertRowid;

    insertLineItem.run(r1, 'Fluid', '15W-40 Synthetic Diesel Engine Oil (6L)', 6, 420.00, 2520.00);
    insertLineItem.run(r1, 'Part', 'Mahindra OEM Oil & Fuel Filter Kit', 1, 1280.00, 1280.00);
    insertLineItem.run(r1, 'Fluid', 'BS6 AdBlue DEF Solution (10L Can)', 1, 850.00, 850.00);
    insertLineItem.run(r1, 'Labor', 'Periodic Inspection & Wheel Balancing', 2.0, 850.00, 1700.00);

    const r2 = insertRepair.run(
      v3, null, twoWeeksAgoStr, 37200,
      'Electrical & Diagnostics',
      'Alternator Rectifier & Amaron Fleet Battery Replacement',
      'Diagnosed intermittent charging warning on highway run; replaced 12V 80Ah heavy-duty battery and cleaned earth terminal.',
      'Suresh Patel', 2.5, 900, 7450.00, 'Completed'
    ).lastInsertRowid;

    insertLineItem.run(r2, 'Diagnostic', 'OBD-II & Alternator Ripple Load Test', 1, 750.00, 750.00);
    insertLineItem.run(r2, 'Part', 'Amaron Hi-Way 12V 80Ah Commercial Battery', 1, 6700.00, 6700.00);
    insertLineItem.run(r2, 'Labor', 'Electrical Troubleshooting & Installation', 2.5, 900.00, 2250.00);

    const r3 = insertRepair.run(
      v2, a1, todayStr, 142300,
      'Engine & Transmission',
      'Reefer Belt Tensioner & BS6 DPF Pressure Sensor',
      'Replacing worn idler pulley, V-ribbed belt, and differential DPF pressure sensor. Highway road test pending.',
      'Ramesh Yadav', 3.5, 950, 11400.00, 'In Progress'
    ).lastInsertRowid;

    insertLineItem.run(r3, 'Part', 'Heavy-Duty Belt Tensioner Assembly', 1, 4800.00, 4800.00);
    insertLineItem.run(r3, 'Part', 'BS6 DPF Differential Pressure Sensor', 1, 5200.00, 5200.00);
    insertLineItem.run(r3, 'Part', '8-Rib Serpentine Drive Belt', 1, 1400.00, 1400.00);
    insertLineItem.run(r3, 'Labor', 'Diesel Bay Mechanical Repair', 3.5, 950.00, 3325.00);

    const r4 = insertRepair.run(
      v6, null, twoWeeksAgoStr, 50400,
      'Tires & Alignment',
      '4-Wheel Laser Alignment & EV Low-Rolling-Resistance Tyres (2x)',
      'Mounted and balanced two rear MRF Ecotred EV tyres; corrected rear camber within Tata factory spec.',
      'Karthik Iyer', 1.5, 850, 14800.00, 'Completed'
    ).lastInsertRowid;

    insertLineItem.run(r4, 'Part', 'MRF Ecotred EV Tyre 215/60R16', 2, 7400.00, 14800.00);
    insertLineItem.run(r4, 'Labor', 'Mount, Balance & 4-Wheel Laser Alignment', 1.5, 850.00, 1275.00);

    const insertInvoice = db.prepare(`
      INSERT INTO invoices (
        invoice_number, repair_id, vehicle_id, customer_id,
        issue_date, due_date, labor_charge, parts_charge, shop_supplies,
        discount_amount, tax_rate, tax_amount, total_amount,
        payment_status, payment_method, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Invoice 1 - Paid via NEFT
    insertInvoice.run(
      'INV-2026-0101', r2, v3, c2,
      twoWeeksAgoStr, addDaysISO(today, 0),
      2250.00, 7450.00, 250.00, 0, 18.0, 1791.00, 11741.00,
      'Paid', 'NEFT / RTGS / IMPS', 'Settled via NEFT UTR #HDFCR520261110.'
    );

    // Invoice 2 - Pending
    insertInvoice.run(
      'INV-2026-0102', r1, v5, c3,
      threeDaysAgoStr, addDaysISO(today, 11),
      1700.00, 4650.00, 250.00, 500.00, 18.0, 1098.00, 7198.00,
      'Pending', 'Corporate NetBanking', 'AMC fleet loyalty discount of ₹500 applied.'
    );

    // Invoice 3 - Paid via UPI
    insertInvoice.run(
      'INV-2026-0103', r4, v6, c4,
      twoWeeksAgoStr, twoWeeksAgoStr,
      1275.00, 14800.00, 200.00, 0, 18.0, 2929.50, 19204.50,
      'Paid', 'UPI (GPay / PhonePe / Paytm)', 'Paid via UPI at workshop counter.'
    );
  });

  seedTx();
}
