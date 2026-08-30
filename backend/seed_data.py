"""Demo knowledge base for MediMind. Safe, educational content only. Clearly
labelled DEMO DATA. Seeded into the RAG index on startup so the app works
end-to-end immediately in Demo Mode."""

DEMO_DOCUMENTS = [
    {
        "filename": "Demo Clinical Guidelines.pdf",
        "text": """DEMO DATA — Demo Clinical Guidelines (Academic Use Only).

Iron Deficiency Anemia. Iron deficiency anemia is the most common cause of anemia worldwide. It occurs when the body lacks sufficient iron to produce hemoglobin. Common symptoms include persistent fatigue and weakness, pale or sallow skin, shortness of breath on exertion, dizziness or lightheadedness, cold hands and feet, brittle or spoon-shaped nails, headache, and unusual cravings for non-food substances known as pica. Diagnosis is supported by low serum ferritin, low serum iron, elevated total iron-binding capacity, and microcytic hypochromic red cells on a blood film. Recommended management includes identifying and treating the underlying cause, such as blood loss or poor dietary intake, and oral iron supplementation with ferrous sulfate. Dietary advice includes iron-rich foods and vitamin C to enhance absorption.

Type 2 Diabetes Mellitus. Type 2 diabetes is characterised by insulin resistance and relative insulin deficiency. Recommended first-line pharmacological treatment is metformin alongside lifestyle modification including diet, weight management and physical activity. Second-line options include SGLT2 inhibitors and GLP-1 receptor agonists, which provide additional cardiovascular and renal benefits. Blood glucose targets should be individualised, with a typical HbA1c goal around 7 percent for many adults. Regular screening for complications such as retinopathy, nephropathy and neuropathy is recommended.

Hypertension. Hypertension is a leading modifiable risk factor for cardiovascular disease. For most adults a blood pressure target below 130/80 mmHg is recommended. First-line antihypertensive agents include ACE inhibitors, angiotensin receptor blockers, calcium channel blockers and thiazide-like diuretics. Recommended lifestyle measures include reducing dietary sodium, following the DASH eating pattern, losing excess weight, limiting alcohol and performing regular aerobic exercise.
""",
    },
    {
        "filename": "Demo Medical Reference.pdf",
        "text": """DEMO DATA — Demo Medical Reference (Academic Use Only).

Anemia Classification. Anemia can be classified by red cell size into microcytic, normocytic and macrocytic categories. Microcytic anemia is commonly caused by iron deficiency and thalassemia. Macrocytic anemia is associated with vitamin B12 or folate deficiency. Normocytic anemia may result from chronic disease, acute blood loss or bone marrow disorders. Laboratory evaluation includes a complete blood count, reticulocyte count, and a peripheral blood film.

Community-Acquired Pneumonia. Community-acquired pneumonia presents with cough, fever, breathlessness and pleuritic chest pain. Severity assessment tools such as CURB-65 guide the decision between outpatient and inpatient care. Empirical antibiotic therapy is selected based on severity and local resistance patterns, and is adjusted once microbiology results are available. Preventive measures include pneumococcal and influenza vaccination.

Common Laboratory Values. Hemoglobin reference ranges are approximately 13.5 to 17.5 g/dL for adult men and 12.0 to 15.5 g/dL for adult women. Serum ferritin below 30 ng/mL strongly suggests iron deficiency. Fasting plasma glucose of 126 mg/dL or higher on two occasions is diagnostic of diabetes. These values are provided for educational demonstration only.
""",
    },
    {
        "filename": "Demo Patient Education.pdf",
        "text": """DEMO DATA — Demo Patient Education Leaflet (Academic Use Only).

Understanding Iron Deficiency Anemia. If you have been told you have iron deficiency anemia, it means your body does not have enough iron to make healthy red blood cells. You may feel tired, look pale, or become short of breath during activity. Your clinician may recommend iron tablets and foods rich in iron such as lean red meat, beans, lentils, tofu, and dark leafy greens. Taking iron with a source of vitamin C, like orange juice, can help your body absorb it. Always follow the advice of your healthcare professional.

Living With Diabetes. Managing type 2 diabetes involves healthy eating, staying active, taking prescribed medicines, and monitoring your blood sugar. Small, consistent changes such as walking regularly and reducing sugary drinks can make a meaningful difference. Attend regular check-ups for your eyes, feet and kidneys.

Managing Blood Pressure. High blood pressure often has no symptoms, so regular measurement is important. Lifestyle steps that help include eating less salt, staying physically active, maintaining a healthy weight and limiting alcohol. Take any prescribed medicines as directed and keep regular appointments with your clinician.
""",
    },
]
