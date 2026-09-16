// รายการตรวจแล็บและแพ็กเกจตรวจสุขภาพมาตรฐาน (คลินิกเวชกรรมนครสวรรค์เฮลท์แคร์)
const OPD_DEFAULT_LABS = [
  {
    "lab_id": "LAB1",
    "category": "HEMATOLOGY",
    "name": "CBC",
    "price": 150,
    "active": true
  },
  {
    "lab_id": "LAB2",
    "category": "HEMATOLOGY",
    "name": "ESR",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB3",
    "category": "HEMATOLOGY",
    "name": "G 6 PD",
    "price": 150,
    "active": true
  },
  {
    "lab_id": "LAB4",
    "category": "HEMATOLOGY",
    "name": "ABO group",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB5",
    "category": "HEMATOLOGY",
    "name": "PT INR",
    "price": 200,
    "active": true
  },
  {
    "lab_id": "LAB6",
    "category": "HEMATOLOGY",
    "name": "OF TEST",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB7",
    "category": "HEMATOLOGY",
    "name": "Hb typing",
    "price": 350,
    "active": true
  },
  {
    "lab_id": "LAB8",
    "category": "HEMATOLOGY",
    "name": "Reticulocyte count",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB9",
    "category": "HEMATOLOGY",
    "name": "Le Test",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB10",
    "category": "HEMATOLOGY",
    "name": "Malarial Parasite",
    "price": 120,
    "active": true
  },
  {
    "lab_id": "LAB11",
    "category": "HEMATOLOGY",
    "name": "Rh group",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB12",
    "category": "HEMATOLOGY",
    "name": "PT",
    "price": 150,
    "active": true
  },
  {
    "lab_id": "LAB13",
    "category": "HEMATOLOGY",
    "name": "DCIP",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB14",
    "category": "HEMATOLOGY",
    "name": "Hb A1C",
    "price": 200,
    "active": true
  },
  {
    "lab_id": "LAB15",
    "category": "MICROSCOPY",
    "name": "U/A",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB16",
    "category": "MICROSCOPY",
    "name": "Stool Exam",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB17",
    "category": "MICROSCOPY",
    "name": "Pregnancy test (UPT)",
    "price": 120,
    "active": true
  },
  {
    "lab_id": "LAB18",
    "category": "MICROSCOPY",
    "name": "Screening influenza A and B",
    "price": 250,
    "active": true
  },
  {
    "lab_id": "LAB19",
    "category": "MICROSCOPY",
    "name": "H. pylori antigen",
    "price": 350,
    "active": true
  },
  {
    "lab_id": "LAB20",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "Dengue IgG/IgM/NS1",
    "price": 350,
    "active": true
  },
  {
    "lab_id": "LAB21",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "VDRL",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB22",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "Anti-HIV",
    "price": 200,
    "active": true
  },
  {
    "lab_id": "LAB23",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "HBs Ag",
    "price": 150,
    "active": true
  },
  {
    "lab_id": "LAB24",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "Anti-HBs",
    "price": 150,
    "active": true
  },
  {
    "lab_id": "LAB25",
    "category": "SEROLOGY AND IMMUNOLOGY",
    "name": "Anti-HCV",
    "price": 250,
    "active": true
  },
  {
    "lab_id": "LAB26",
    "category": "BIOCHEMISTRY",
    "name": "FBS (Fasting Blood Sugar)",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB27",
    "category": "BIOCHEMISTRY",
    "name": "BUN",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB28",
    "category": "BIOCHEMISTRY",
    "name": "Creatinine",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB29",
    "category": "BIOCHEMISTRY",
    "name": "Uric acid",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB30",
    "category": "BIOCHEMISTRY",
    "name": "Cholesterol",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB31",
    "category": "BIOCHEMISTRY",
    "name": "Triglyceride",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB32",
    "category": "BIOCHEMISTRY",
    "name": "HDL cholesterol",
    "price": 100,
    "active": true
  },
  {
    "lab_id": "LAB33",
    "category": "BIOCHEMISTRY",
    "name": "LDL (direct)",
    "price": 120,
    "active": true
  },
  {
    "lab_id": "LAB34",
    "category": "BIOCHEMISTRY",
    "name": "Lipid Profile (TC, TG, HDL, LDL)",
    "price": 250,
    "active": true
  },
  {
    "lab_id": "LAB35",
    "category": "BIOCHEMISTRY",
    "name": "LFT (Liver Function Test)",
    "price": 300,
    "active": true
  },
  {
    "lab_id": "LAB36",
    "category": "BIOCHEMISTRY",
    "name": "SGOT (AST)",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB37",
    "category": "BIOCHEMISTRY",
    "name": "SGPT (ALT)",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB38",
    "category": "BIOCHEMISTRY",
    "name": "Alkaline phosphatase (ALP)",
    "price": 80,
    "active": true
  },
  {
    "lab_id": "LAB39",
    "category": "BIOCHEMISTRY",
    "name": "Electrolytes (Na, K, Cl, CO2)",
    "price": 180,
    "active": true
  },
  {
    "lab_id": "LAB40",
    "category": "BIOCHEMISTRY",
    "name": "TSH",
    "price": 200,
    "active": true
  },
  {
    "lab_id": "LAB41",
    "category": "BIOCHEMISTRY",
    "name": "FT3",
    "price": 200,
    "active": true
  },
  {
    "lab_id": "LAB42",
    "category": "BIOCHEMISTRY",
    "name": "FT4",
    "price": 200,
    "active": true
  }
];

const OPD_DEFAULT_LAB_SETS = [
  {
    "set_id": "SET_CHECKUP",
    "name": "ชุดตรวจสุขภาพประจำปี (Annual Checkup)",
    "category": "ตรวจสุขภาพ",
    "description": "CBC, FBS, Lipid Profile, BUN, Cr, SGOT, SGPT, U/A, Uric Acid",
    "items": [
      {
        "lab_id": "LAB1",
        "name": "CBC",
        "category": "HEMATOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB26",
        "name": "FBS (Fasting Blood Sugar)",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB34",
        "name": "Lipid Profile (TC, TG, HDL, LDL)",
        "category": "BIOCHEMISTRY",
        "price": 250
      },
      {
        "lab_id": "LAB27",
        "name": "BUN",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB28",
        "name": "Creatinine",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB36",
        "name": "SGOT (AST)",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB37",
        "name": "SGPT (ALT)",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB15",
        "name": "U/A",
        "category": "MICROSCOPY",
        "price": 80
      },
      {
        "lab_id": "LAB29",
        "name": "Uric acid",
        "category": "BIOCHEMISTRY",
        "price": 100
      }
    ],
    "price": 980
  },
  {
    "set_id": "SET_DM_RENAL",
    "name": "ชุดเบาหวาน & ไต (DM & Renal Profile)",
    "category": "NCDs",
    "description": "FBS, Hb A1C, BUN, Creatinine, U/A",
    "items": [
      {
        "lab_id": "LAB26",
        "name": "FBS (Fasting Blood Sugar)",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB14",
        "name": "Hb A1C",
        "category": "HEMATOLOGY",
        "price": 200
      },
      {
        "lab_id": "LAB27",
        "name": "BUN",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB28",
        "name": "Creatinine",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB15",
        "name": "U/A",
        "category": "MICROSCOPY",
        "price": 80
      }
    ],
    "price": 520
  },
  {
    "set_id": "SET_LIPID_LFT",
    "name": "ชุดไขมัน & การทำงานตับ (Lipid & LFT Profile)",
    "category": "NCDs",
    "description": "Lipid Profile (TC, TG, HDL, LDL), LFT (SGOT, SGPT, ALP)",
    "items": [
      {
        "lab_id": "LAB34",
        "name": "Lipid Profile (TC, TG, HDL, LDL)",
        "category": "BIOCHEMISTRY",
        "price": 250
      },
      {
        "lab_id": "LAB35",
        "name": "LFT (Liver Function Test)",
        "category": "BIOCHEMISTRY",
        "price": 300
      }
    ],
    "price": 550
  },
  {
    "set_id": "SET_RENAL",
    "name": "ชุดตรวจการทำงานไต (Renal Function Test)",
    "category": "NCDs",
    "description": "BUN, Creatinine, Electrolytes (Na, K, Cl, CO2), U/A",
    "items": [
      {
        "lab_id": "LAB27",
        "name": "BUN",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB28",
        "name": "Creatinine",
        "category": "BIOCHEMISTRY",
        "price": 80
      },
      {
        "lab_id": "LAB39",
        "name": "Electrolytes (Na, K, Cl, CO2)",
        "category": "BIOCHEMISTRY",
        "price": 180
      },
      {
        "lab_id": "LAB15",
        "name": "U/A",
        "category": "MICROSCOPY",
        "price": 80
      }
    ],
    "price": 420
  },
  {
    "set_id": "SET_FEVER",
    "name": "ชุดตรวจไข้หวัด / ติดเชื้อเฉียบพลัน (Fever & Infection)",
    "category": "ทั่วไป/ติดเชื้อ",
    "description": "CBC, U/A, Screening influenza A and B, Dengue IgG/IgM/NS1",
    "items": [
      {
        "lab_id": "LAB1",
        "name": "CBC",
        "category": "HEMATOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB15",
        "name": "U/A",
        "category": "MICROSCOPY",
        "price": 80
      },
      {
        "lab_id": "LAB18",
        "name": "Screening influenza A and B",
        "category": "MICROSCOPY",
        "price": 250
      },
      {
        "lab_id": "LAB20",
        "name": "Dengue IgG/IgM/NS1",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 350
      }
    ],
    "price": 830
  },
  {
    "set_id": "SET_THYROID",
    "name": "ชุดตรวจต่อมไทรอยด์ (Thyroid Profile)",
    "category": "ฮอร์โมน",
    "description": "TSH, FT3, FT4",
    "items": [
      {
        "lab_id": "LAB40",
        "name": "TSH",
        "category": "BIOCHEMISTRY",
        "price": 200
      },
      {
        "lab_id": "LAB41",
        "name": "FT3",
        "category": "BIOCHEMISTRY",
        "price": 200
      },
      {
        "lab_id": "LAB42",
        "name": "FT4",
        "category": "BIOCHEMISTRY",
        "price": 200
      }
    ],
    "price": 600
  },
  {
    "set_id": "SET_ANC",
    "name": "ชุดตรวจฝากครรภ์เบื้องต้น (ANC Profile)",
    "category": "สูติ-นรีเวช",
    "description": "CBC, ABO group, Rh group, VDRL, Anti-HIV, HBs Ag, U/A, UPT",
    "items": [
      {
        "lab_id": "LAB1",
        "name": "CBC",
        "category": "HEMATOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB4",
        "name": "ABO group",
        "category": "HEMATOLOGY",
        "price": 80
      },
      {
        "lab_id": "LAB11",
        "name": "Rh group",
        "category": "HEMATOLOGY",
        "price": 80
      },
      {
        "lab_id": "LAB21",
        "name": "VDRL",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 100
      },
      {
        "lab_id": "LAB22",
        "name": "Anti-HIV",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 200
      },
      {
        "lab_id": "LAB23",
        "name": "HBs Ag",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB15",
        "name": "U/A",
        "category": "MICROSCOPY",
        "price": 80
      },
      {
        "lab_id": "LAB17",
        "name": "Pregnancy test (UPT)",
        "category": "MICROSCOPY",
        "price": 120
      }
    ],
    "price": 960
  },
  {
    "set_id": "SET_PREOP",
    "name": "ชุดตรวจก่อนทำหัตถการ/ผ่าตัด (Pre-Op Workup)",
    "category": "หัตถการ",
    "description": "CBC, PT INR, PT, Anti-HIV, HBs Ag, Anti-HCV, ABO group",
    "items": [
      {
        "lab_id": "LAB1",
        "name": "CBC",
        "category": "HEMATOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB5",
        "name": "PT INR",
        "category": "HEMATOLOGY",
        "price": 200
      },
      {
        "lab_id": "LAB12",
        "name": "PT",
        "category": "HEMATOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB22",
        "name": "Anti-HIV",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 200
      },
      {
        "lab_id": "LAB23",
        "name": "HBs Ag",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB25",
        "name": "Anti-HCV",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 250
      },
      {
        "lab_id": "LAB4",
        "name": "ABO group",
        "category": "HEMATOLOGY",
        "price": 80
      }
    ],
    "price": 1180
  },
  {
    "set_id": "SET_STD",
    "name": "ชุดตรวจโรคติดต่อทางเพศสัมพันธ์ (STD Screening)",
    "category": "ตรวจพิเศษ",
    "description": "VDRL, Anti-HIV, HBs Ag, Anti-HCV",
    "items": [
      {
        "lab_id": "LAB21",
        "name": "VDRL",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 100
      },
      {
        "lab_id": "LAB22",
        "name": "Anti-HIV",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 200
      },
      {
        "lab_id": "LAB23",
        "name": "HBs Ag",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 150
      },
      {
        "lab_id": "LAB25",
        "name": "Anti-HCV",
        "category": "SEROLOGY AND IMMUNOLOGY",
        "price": 250
      }
    ],
    "price": 700
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { OPD_DEFAULT_LABS, OPD_DEFAULT_LAB_SETS };
}
