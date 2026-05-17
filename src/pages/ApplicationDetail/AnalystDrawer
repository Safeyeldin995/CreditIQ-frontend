import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/Toast'
import { Save, ChevronLeft } from 'lucide-react'

const RELATIONS = ['زوجة', 'زوج', 'أخ', 'أخت', 'ابن', 'ابنة', 'صديق', 'شريك', 'جار', 'أخرى']
const JOBS = ['موظف حكومي', 'موظف قطاع خاص', 'عمل حر / تجارة', 'مهنة حرة', 'معلم / مدرس', 'طبيب', 'محاسب', 'مهندس', 'بدون عمل', 'متقاعد', 'أخرى']
const CALL_RESULTS = ['إيجابي', 'سلبي', 'لم يرد', 'وعد بالإعادة', 'رفض التحدث']
const DECISIONS = ['موافقة', 'موافقة بشروط', 'رفض', 'إحالة للجنة']
const COLLATERAL_OPTIONS = ['شيكات بنكية', 'شيكات بريدية', 'رهن حيازي', 'رهن عقاري', 'كفيل شخصي', 'عباءات مالية']
const FIXED_FULFILLMENTS = [
  'توقيع جميع العقود والشيكات وفقاً لقرار العام رقم 93',
  'التوقيع خلال 7 أيام عمل بحد أقصى من تاريخ الإخطار',
  'تقديم صورة البطاقة القومية للعميل والضامنين',
  'تسليم كشف حساب بنكي محدث',
  'استخراج مستخرج السجل التجاري',
  'توقيع الزوج/الزوجة على عقد الرهن الحيازي',
  'إرسال بطاقة قريب العميل للاستعلام',
  'إزالة السمة التجارية لعدم وجودها بالسجل التجاري',
  'كتابة اسم الشركات المنتجة للبضاعة الموجودة بالكشف',
  'عمل رهن بسجل الضمانات المنقولة وفقاً لملحق عقد الضمان',
]
const FIVE_CS_ITEMS = {
  character: { label: 'شخصية العميل', max: 5, items: [
    { key: 'c_education', label: 'المؤهل الدراسي', max: 1, options: [{label:'مؤهل عالي',val:1},{label:'مؤهل متوسط',val:0.5},{label:'بدون مؤهل',val:0}] },
    { key: 'c_trust', label: 'مستوى الثقة بعد المكالمة', max: 1, options: [{label:'ثقة عالية',val:1},{label:'ثقة متوسطة',val:0.5},{label:'ثقة ضعيفة',val:0}] },
    { key: 'c_job', label: 'طبيعة العمل', max: 1, options: [{label:'صاحب نشاط مستقر',val:1},{label:'موظف مع نشاط',val:0.5},{label:'بدون عمل ثابت',val:0}] },
    { key: 'c_residence', label: 'استقرار السكن', max: 1, options: [{label:'أكثر من 3 سنوات',val:1},{label:'1 إلى 3 سنوات',val:0.5},{label:'أقل من سنة',val:0}] },
    { key: 'c_business_stability', label: 'استقرار النشاط', max: 1, options: [{label:'أكثر من 3 سنوات',val:1},{label:'1 إلى 3 سنوات',val:0.5},{label:'أقل من سنة',val:0}] },
  ]},
  credit_history: { label: 'التاريخ الائتماني', max: 5, items: [
    { key: 'cr_personal_banks', label: 'تمويلات شخصية ببنوك', max: 1, options: [{label:'منتظم',val:1},{label:'تأخر بسيط',val:0.5},{label:'متعثر',val:0}] },
    { key: 'cr_business_banks', label: 'تمويلات أنشطة ببنوك', max: 1, options: [{label:'منتظم',val:1},{label:'تأخر بسيط',val:0.5},{label:'متعثر أو لا يوجد',val:0}] },
    { key: 'cr_companies', label: 'تمويلات أنشطة شركات', max: 0.5, options: [{label:'منتظم',val:0.5},{label:'تأخر بسيط',val:0.25},{label:'متعثر أو لا يوجد',val:0}] },
    { key: 'cr_bank_regularity', label: 'انتظام العميل بالبنوك', max: 1, options: [{label:'منتظم جداً',val:1},{label:'متوسط',val:0.5},{label:'غير منتظم',val:0}] },
    { key: 'cr_companies_regularity', label: 'انتظام بالشركات', max: 0.5, options: [{label:'منتظم',val:0.5},{label:'متوسط',val:0.25},{label:'غير منتظم',val:0}] },
    { key: 'cr_current_loans', label: 'التمويلات الجارية مقارنة بالمطلوب', max: 0.5, options: [{label:'أقل من 50%',val:0.5},{label:'50 إلى 80%',val:0.25},{label:'أكثر من 80%',val:0}] },
    { key: 'cr_inquiries', label: 'عدد الاستعلامات والتقييم الرقمي', max: 0.5, options: [{label:'أقل من 5 استعلامات',val:0.5},{label:'5 إلى 10',val:0.25},{label:'أكثر من 10',val:0}] },
  ]},
  collateral: { label: 'الضمانات', max: 4.5, items: [
    { key: 'col_guarantors', label: 'ضمان أفراد', max: 1, options: [{label:'ضامن مليء بوظيفة ثابتة',val:1},{label:'ضامن بعمل حر',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_ecr', label: 'رهن حيازي أول يد', max: 1, options: [{label:'يوجد بقيمة كافية',val:1},{label:'يوجد بقيمة جزئية',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_bank_cheques', label: 'شيكات بنكية / بريدية للعميل', max: 1, options: [{label:'يوجد',val:1},{label:'جزئي',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_guarantee_cheques', label: 'شيكات ضمان بنكي / بريدي', max: 0.5, options: [{label:'يوجد',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_client_insurance', label: 'عباءات مالية للعميل', max: 0.5, options: [{label:'يوجد',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_guarantor_insurance', label: 'عباءات مالية للضمان', max: 0.5, options: [{label:'يوجد',val:0.5},{label:'لا يوجد',val:0}] },
  ]},
  capital: { label: 'رأس المال', max: 5, items: [
    { key: 'cap_leverage', label: 'الرافعة المالية', max: 1, options: [{label:'يوجد وكافية',val:1},{label:'يوجد جزئياً',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'cap_business_ownership', label: 'ملكية محل النشاط', max: 2, options: [{label:'ملك تام',val:2},{label:'إيجار موثق',val:1},{label:'إيجار غير موثق',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'cap_residence', label: 'ملكية السكن', max: 1, options: [{label:'ملك',val:1},{label:'إيجار',val:0.5},{label:'مع العائلة',val:0}] },
    { key: 'cap_tools', label: 'أدوات تخدم النشاط', max: 1, options: [{label:'يوجد بقيمة جيدة',val:1},{label:'يوجد جزئياً',val:0.5},{label:'لا يوجد',val:0}] },
  ]},
  conditions: { label: 'الظروف المحيطة', max: 5, items: [
    { key: 'cond_operation', label: 'انتظام التشغيل', max: 1, options: [{label:'منتظم جداً',val:1},{label:'متوسط',val:0.5},{label:'غير منتظم',val:0}] },
    { key: 'cond_employees', label: 'عدد العمالة', max: 1, options: [{label:'أكثر من 5',val:1},{label:'2 إلى 5',val:0.5},{label:'بدون عمالة',val:0}] },
    { key: 'cond_legal', label: 'الوضع القانوني', max: 3, options: [{label:'مرخص بالكامل',val:3},{label:'مرخص جزئياً',val:1.5},{label:'قيد الاستخراج',val:0.5},{label:'غير مرخص',val:0}] },
  ]},
}
const SECTIONS = [
  {id:'ai',label:'البيانات المستخرجة'},
  {id:'visit',label:'الزيارة الميدانية'},
  {id:'guarantors',label:'الضامنون'},
  {id:'calls',label:'المكالمات'},
  {id:'scoring',label:'نموذج التسعير'},
  {id:'fivecs',label:'تقييم الجدارة'},
  {id:'decision',label:'القرار النهائي'},
]

function Row({label,children}){return(<div><label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>{children}</div>)}
function G2({children}){return(<div className="grid grid-cols-2 gap-3">{children}</div>)}
function Card({children}){return(<div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">{children}</div>)}
function STitle({id,label}){return(<h2 id={"section-"+id} className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4 scroll-mt-24">{label}</h2>)}

function Sel({value,onChange,options,placeholder='اختر...'}){
  return(<select value={value||''} onChange={e=>onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400">
    <option value="">{placeholder}</option>
    {options.map(o=>(<option key={typeof o==='string'?o:o.value} value={typeof o==='string'?o:o.value}>{typeof o==='string'?o:o.label}</option>))}
  </select>)
}
function Inp({value,onChange,type='text',placeholder=''}){
  return(<input type={type} value={value||''} placeholder={placeholder} onChange={e=>onChange(type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"/>)
}
function Toggle({label,value,onChange}){
  return(<div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-700">{label}</span>
    <div onClick={()=>onChange(!value)} className={`w-12 h-6 rounded-full cursor-pointer relative flex-shrink-0 transition-colors ${value?'bg-emerald-500':'bg-gray-300'}`}>
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all duration-200 ${value?'right-0.5':'left-0.5'}`}/>
    </div>
  </div>)
}

const INIT = {
  operation_rating:'',employee_count:'',legal_status:'',business_ownership:'',residence_ownership:'',has_tools:false,has_leverage:false,
  sales_specialist:'',sales_investigator:'',sales_manager:'',sales_proof:'',purchases_proof:'',monthly_expenses:'',
  capital_specialist:'',capital_investigator:'',capital_manager:'',
  g1_name:'',g1_age:'',g1_relation:'',g1_job:'',g1_employer:'',g1_residence:'',g1_has_debts:false,
  g2_name:'',g2_age:'',g2_relation:'',g2_job:'',g2_employer:'',g2_residence:'',g2_has_debts:false,
  client_called:false,client_call_result:'',client_call_notes:'',
  g1_called:false,g1_call_result:'',g1_call_notes:'',
  g2_called:false,g2_call_result:'',g2_call_notes:'',
  suppliers_called:false,suppliers_notes:'',
  c_education:0,c_trust:0,c_job:0,c_residence:0,c_business_stability:0,
  cr_personal_banks:0,cr_business_banks:0,cr_companies:0,cr_bank_regularity:0,cr_companies_regularity:0,cr_current_loans:0,cr_inquiries:0,
  col_guarantors:0,col_ecr:0,col_bank_cheques:0,col_guarantee_cheques:0,col_client_insurance:0,col_guarantor_insurance:0,
  cap_leverage:0,cap_business_ownership:0,cap_residence:0,cap_tools:0,
  cond_operation:0,cond_employees:0,cond_legal:0,
  sc1:0,sc2:0,sc3:0,sc4:0,sc5:0,sc6:0,sc7:0,sc8:0,sc9:0,sc10:0,sc11:0,sc12:0,
  analyst_decision:'',recommended_amount:'',collaterals:[],fulfillments:[],analyst_notes:'',analyst_name:'',
  ai_iscore_grade:'',ai_iscore_score:'',ai_outstanding_loans:'',ai_avg_balance:'',ai_returned_cheques:false,
  ai_ecr_value:'',ai_monthly_sales:'',ai_monthly_purchases:'',ai_iscore_notes:'',ai_bank_notes:'',ai_study_notes:'',ai_field_notes:'',
  ai_inquiries_count:'',ai_credit_flow:'',
}

export default function AnalystDrawer({application,lang,onClose,onSaved}){
  const [data,setData]=useState(INIT)
  const [saving,setSaving]=useState(false)
  const [existingId,setExistingId]=useState(null)
  const [activeSection,setActiveSection]=useState('ai')
  const toast=useToast()
  const set=(k,v)=>setData(p=>({...p,[k]:v}))

  useEffect(()=>{loadExisting();loadAIData()},[application.id])

  async function loadExisting(){
    const {data:ex}=await supabase.from('analyst_assessments').select('*').eq('application_id',application.id).single()
    if(ex){
      setExistingId(ex.id)
      const d=ex.five_cs_details||{}
      setData(p=>({...p,...ex,...d,
        collaterals:ex.collaterals?ex.collaterals.split(',').filter(Boolean):[],
        fulfillments:ex.fulfillments?ex.fulfillments.split('||').filter(Boolean):[],
      }))
    }
  }

  async function loadAIData(){
    const {data:rd}=await supabase.from('risk_decision').select('*').eq('application_id',application.id).order('generated_at',{ascending:false}).limit(1).single()
    if(rd){
      setData(p=>({...p,
        ai_iscore_grade:p.ai_iscore_grade||rd.risk_grade||'',
        ai_iscore_score:p.ai_iscore_score||rd.risk_score||'',
      }))
    }
  }

  function calcScores(){
    const char=(data.c_education||0)+(data.c_trust||0)+(data.c_job||0)+(data.c_residence||0)+(data.c_business_stability||0)
    const credit=(data.cr_personal_banks||0)+(data.cr_business_banks||0)+(data.cr_companies||0)+(data.cr_bank_regularity||0)+(data.cr_companies_regularity||0)+(data.cr_current_loans||0)+(data.cr_inquiries||0)
    const col=(data.col_guarantors||0)+(data.col_ecr||0)+(data.col_bank_cheques||0)+(data.col_guarantee_cheques||0)+(data.col_client_insurance||0)+(data.col_guarantor_insurance||0)
    const cap=(data.cap_leverage||0)+(data.cap_business_ownership||0)+(data.cap_residence||0)+(data.cap_tools||0)
    const cond=(data.cond_operation||0)+(data.cond_employees||0)+(data.cond_legal||0)
    return{char,credit,col,cap,cond,total:char+credit+col+cap+cond}
  }

  function autoAmount(total){
    const req=Number(application.requested_amount)||0
    if(total>=20)return req
    if(total>=15)return Math.round(req*0.75)
    if(total>=10)return Math.round(req*0.5)
    return 0
  }

  const toggleItem=(key,item)=>setData(p=>({...p,[key]:p[key].includes(item)?p[key].filter(c=>c!==item):[...p[key],item]}))

  async function handleSave(){
    setSaving(true)
    const scores=calcScores()
    const five_cs_details={}
    Object.values(FIVE_CS_ITEMS).forEach(c=>c.items.forEach(i=>{five_cs_details[i.key]=data[i.key]||0}))
    const payload={
      application_id:application.id,
      operation_rating:data.operation_rating,employee_count:data.employee_count,legal_status:data.legal_status,
      business_ownership:data.business_ownership,residence_ownership:data.residence_ownership,
      has_tools:data.has_tools,has_leverage:data.has_leverage,
      sales_specialist:data.sales_specialist,sales_investigator:data.sales_investigator,sales_manager:data.sales_manager,
      sales_proof:data.sales_proof,purchases_proof:data.purchases_proof,monthly_expenses:data.monthly_expenses,
      capital_specialist:data.capital_specialist,capital_investigator:data.capital_investigator,capital_manager:data.capital_manager,
      g1_name:data.g1_name,g1_age:data.g1_age,g1_relation:data.g1_relation,g1_job:data.g1_job,g1_employer:data.g1_employer,g1_residence:data.g1_residence,g1_has_debts:data.g1_has_debts,
      g2_name:data.g2_name,g2_age:data.g2_age,g2_relation:data.g2_relation,g2_job:data.g2_job,g2_employer:data.g2_employer,g2_residence:data.g2_residence,g2_has_debts:data.g2_has_debts,
      client_called:data.client_called,client_call_result:data.client_call_result,client_call_notes:data.client_call_notes,
      g1_called:data.g1_called,g1_call_result:data.g1_call_result,g1_call_notes:data.g1_call_notes,
      g2_called:data.g2_called,g2_call_result:data.g2_call_result,g2_call_notes:data.g2_call_notes,
      suppliers_called:data.suppliers_called,suppliers_notes:data.suppliers_notes,
      five_cs_details,
      score_character:scores.char,score_credit_history:scores.credit,score_collateral:scores.col,score_capital:scores.cap,score_conditions:scores.cond,total_score:scores.total,
      ai_iscore_grade:data.ai_iscore_grade,ai_iscore_score:data.ai_iscore_score,ai_outstanding_loans:data.ai_outstanding_loans,
      ai_avg_balance:data.ai_avg_balance,ai_returned_cheques:data.ai_returned_cheques,ai_ecr_value:data.ai_ecr_value,
      ai_monthly_sales:data.ai_monthly_sales,ai_monthly_purchases:data.ai_monthly_purchases,
      analyst_decision:data.analyst_decision,analyst_name:data.analyst_name,analyst_notes:data.analyst_notes,
      collaterals:data.collaterals.join(','),fulfillments:data.fulfillments.join('||'),
      recommended_amount:data.recommended_amount||autoAmount(scores.total),
      updated_at:new Date().toISOString(),
    }
    let error
    if(existingId){const res=await supabase.from('analyst_assessments').update(payload).eq('id',existingId);error=res.error}
    else{const res=await supabase.from('analyst_assessments').insert(payload).select().single();error=res.error;if(res.data)setExistingId(res.data.id)}
    if(error)toast('خطأ: '+error.message,'error')
    else{toast('تم حفظ التقييم ✓','success');onSaved?.()}
    setSaving(false)
  }

  const scores=calcScores()
  const scoreLabel=scores.total>=20?'موافقة بنفس المبلغ':scores.total>=15?'موافقة بتخفيض 25%':scores.total>=10?'تخفيض 50%':'رفض قطعاً'
  const scoreColor=scores.total>=20?'text-emerald-400':scores.total>=15?'text-amber-400':scores.total>=10?'text-orange-400':'text-red-400'
  const SC_KEYS=['sc1','sc2','sc3','sc4','sc5','sc6','sc7','sc8','sc9','sc10','sc11','sc12']
  const SC_ROWS=[
    {key:'sc1',label:'مدة التمويل',opts:[{l:'أقل من 6 أشهر',v:1},{l:'6-12 شهر',v:2},{l:'12-24 شهر',v:3},{l:'أكثر من 24 شهر',v:2}]},
    {key:'sc2',label:'فترة سداد القسط الأول',opts:[{l:'أكثر من سنة',v:1},{l:'8-12 شهر',v:2},{l:'4-7 أشهر',v:2},{l:'1-3 أشهر',v:3}]},
    {key:'sc3',label:'طبيعة القرض الاستمراري',opts:[{l:'منخفض المخاطر',v:3},{l:'متوسط المخاطر',v:2},{l:'مرتفع المخاطر',v:1},{l:'غير محدد',v:0}]},
    {key:'sc4',label:'أسلوب صرف التمويل',opts:[{l:'السداد المدورون',v:3},{l:'العملاء المستمرون',v:2},{l:'العملاء الجدد',v:1},{l:'أخرى',v:0}]},
    {key:'sc5',label:'تاريخ معاملات العميل مع الجمعية',opts:[{l:'أكثر من عام منتظم',v:3},{l:'مرة واحدة منتظم',v:2},{l:'مرة واحدة غير منتظم',v:1},{l:'جديد',v:0}]},
    {key:'sc6',label:'طبيعة الائتمان والجهة',opts:[{l:'تمويل احتياجات إدارية',v:3},{l:'تمويل مزدوج',v:2},{l:'تمويل استشاري',v:1},{l:'انصراف نقدي مباشر',v:0}]},
    {key:'sc7',label:'مدى تطبيق آلية ضمان السداد',opts:[{l:'ضمانات عالية القيمة',v:3},{l:'ضمانات متوسطة',v:2},{l:'ضمانات شخصية',v:1},{l:'بدون ضمانات',v:0}]},
    {key:'sc8',label:'طبيعة وتنوع مصادر الأعمال',opts:[{l:'متنوعة ومستقرة',v:3},{l:'متوسطة',v:2},{l:'غير متنوعة',v:1},{l:'مصدر واحد',v:0}]},
    {key:'sc9',label:'مكان تمويل المشروع أو الأصول',opts:[{l:'الموقع الحالي مستقر',v:3},{l:'انتقل مرة',v:2},{l:'انتقل أكثر من مرة',v:1},{l:'جديد بالموقع',v:0}]},
    {key:'sc10',label:'طريقة التحصيل التمويلية',opts:[{l:'السداد المدوّر',v:3},{l:'السداد الدائم',v:2},{l:'العميل الجديد',v:1},{l:'أخرى',v:0}]},
    {key:'sc11',label:'وقت تحصيل العائد على التمويل',opts:[{l:'عائد دوري سريع',v:3},{l:'عائد متوسط',v:2},{l:'عائد بطيء',v:1},{l:'غير محدد',v:0}]},
    {key:'sc12',label:'الشرائح التمويلية المسموح بها',opts:[{l:'تحصيل مبكر قبل الأجل',v:3},{l:'شريحة دون نهاية',v:2},{l:'أقل من 5 سنوات',v:1},{l:'شريحة غير مستمرة',v:0}]},
  ]

  return(
    <div className="fixed inset-0 z-50 bg-gray-100" dir="rtl">
      <div className="bg-navy-900 text-white px-6 py-3 flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-navy-300 hover:text-white flex items-center gap-1 text-sm"><ChevronLeft size={16}/>رجوع</button>
          <div><span className="font-bold">{application.client_name_ar}</span><span className="text-navy-400 text-sm mx-2">—</span><span className="text-navy-300 text-sm">{application.reference_code}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${scoreColor}`}>الإجمالي: {scores.total.toFixed(1)} — {scoreLabel}</span>
          <button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Save size={14}/>{saving?'جاري الحفظ...':'حفظ التقييم'}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-52px)]">
        <div className="w-48 bg-white border-l border-gray-100 flex flex-col py-4 gap-1 px-2 flex-shrink-0 overflow-y-auto">
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>{setActiveSection(s.id);document.getElementById('section-'+s.id)?.scrollIntoView({behavior:'smooth',block:'start'})}}
              className={`text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeSection===s.id?'bg-navy-900 text-white':'text-gray-500 hover:bg-gray-100'}`}>
              {s.label}
            </button>
          ))}
          <div className="mt-auto pt-4 border-t border-gray-100 px-1">
            <p className="text-xs text-gray-400 mb-2">ملخص الدرجات</p>
            {[{l:'الشخصية',v:scores.char,m:5},{l:'الائتمان',v:scores.credit,m:5},{l:'الضمانات',v:scores.col,m:4.5},{l:'رأس المال',v:scores.cap,m:5},{l:'الظروف',v:scores.cond,m:5}].map(s=>(
              <div key={s.l} className="flex justify-between text-xs mb-1"><span className="text-gray-500">{s.l}</span><span className="font-bold text-navy-700">{s.v.toFixed(1)}/{s.m}</span></div>
            ))}
            <div className="flex justify-between text-sm font-bold mt-2 pt-2 border-t border-gray-100">
              <span>الإجمالي</span><span className={scoreColor}>{scores.total.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          <div id="section-ai">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">البيانات المستخرجة بالذكاء الاصطناعي — قابلة للتعديل</h2>
            <Card>
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2 mb-4 font-semibold">هذه البيانات استخرجها الذكاء الاصطناعي من المستندات المرفوعة. راجعها وعدّل ما يلزم قبل الحفظ.</p>
              <h4 className="text-sm font-bold text-navy-700 mb-3 border-b pb-2">من الايسكور</h4>
              <G2>
                <Row label="التصنيف الائتماني (A-F)"><Inp value={data.ai_iscore_grade} onChange={v=>set('ai_iscore_grade',v)} placeholder="A"/></Row>
                <Row label="الدرجة الرقمية"><Inp type="number" value={data.ai_iscore_score} onChange={v=>set('ai_iscore_score',v)} placeholder="750"/></Row>
                <Row label="إجمالي الالتزامات القائمة (جنيه)"><Inp type="number" value={data.ai_outstanding_loans} onChange={v=>set('ai_outstanding_loans',v)}/></Row>
                <Row label="عدد الاستعلامات"><Inp type="number" value={data.ai_inquiries_count} onChange={v=>set('ai_inquiries_count',v)}/></Row>
              </G2>
              <Toggle label="يوجد شيكات مرتجعة أو تعثر" value={data.ai_returned_cheques} onChange={v=>set('ai_returned_cheques',v)}/>
              <Row label="ملاحظات الايسكور"><textarea value={data.ai_iscore_notes||''} onChange={e=>set('ai_iscore_notes',e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>

              <h4 className="text-sm font-bold text-navy-700 mt-5 mb-3 border-b pb-2">من كشف الحساب البنكي</h4>
              <G2>
                <Row label="متوسط الرصيد الشهري (جنيه)"><Inp type="number" value={data.ai_avg_balance} onChange={v=>set('ai_avg_balance',v)}/></Row>
                <Row label="حجم التدفق الدائن الشهري (جنيه)"><Inp type="number" value={data.ai_credit_flow} onChange={v=>set('ai_credit_flow',v)}/></Row>
              </G2>
              <Row label="ملاحظات كشف الحساب"><textarea value={data.ai_bank_notes||''} onChange={e=>set('ai_bank_notes',e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>

              <h4 className="text-sm font-bold text-navy-700 mt-5 mb-3 border-b pb-2">من عقد الرهن الحيازي (ECR)</h4>
              <Row label="قيمة الرهن الحيازي الإجمالية (جنيه)"><Inp type="number" value={data.ai_ecr_value} onChange={v=>set('ai_ecr_value',v)}/></Row>

              <h4 className="text-sm font-bold text-navy-700 mt-5 mb-3 border-b pb-2">من الدراسة الائتمانية</h4>
              <G2>
                <Row label="المبيعات الشهرية المثبتة (جنيه)"><Inp type="number" value={data.ai_monthly_sales} onChange={v=>set('ai_monthly_sales',v)}/></Row>
                <Row label="المشتريات الشهرية (جنيه)"><Inp type="number" value={data.ai_monthly_purchases} onChange={v=>set('ai_monthly_purchases',v)}/></Row>
              </G2>
              <Row label="ملاحظات الدراسة الائتمانية"><textarea value={data.ai_study_notes||''} onChange={e=>set('ai_study_notes',e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>

              <h4 className="text-sm font-bold text-navy-700 mt-5 mb-3 border-b pb-2">من تقرير الاستعلام الميداني</h4>
              <Row label="ملاحظات الاستعلام الميداني"><textarea value={data.ai_field_notes||''} onChange={e=>set('ai_field_notes',e.target.value)} rows={3} placeholder="ملخص ما رصده الذكاء الاصطناعي من تقرير الاستعلام..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>
            </Card>
          </div>

          <div id="section-visit">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">بيانات الزيارة الميدانية</h2>
            <Card>
              <G2>
                <Row label="انتظام التشغيل"><Sel value={data.operation_rating} onChange={v=>set('operation_rating',v)} options={['ممتاز','جيد','متوسط','ضعيف']}/></Row>
                <Row label="عدد العمالة"><Sel value={data.employee_count} onChange={v=>set('employee_count',v)} options={['1 إلى 5','6 إلى 10','أكثر من 10','بدون عمالة']}/></Row>
                <Row label="الوضع القانوني للنشاط"><Sel value={data.legal_status} onChange={v=>set('legal_status',v)} options={['مرخص بالكامل','مرخص جزئياً','قيد الاستخراج','غير مرخص']}/></Row>
                <Row label="ملكية محل النشاط"><Sel value={data.business_ownership} onChange={v=>set('business_ownership',v)} options={['ملك تام','إيجار موثق','إيجار غير موثق']}/></Row>
                <Row label="ملكية السكن"><Sel value={data.residence_ownership} onChange={v=>set('residence_ownership',v)} options={['ملك','إيجار','مع العائلة']}/></Row>
              </G2>
              <Toggle label="يوجد أدوات تخدم النشاط" value={data.has_tools} onChange={v=>set('has_tools',v)}/>
              <Toggle label="يوجد رافعة مالية (ديون تجارية أو بضاعة بالأجل)" value={data.has_leverage} onChange={v=>set('has_leverage',v)}/>
              <h4 className="text-sm font-bold text-navy-700 mt-4 mb-3 border-b pb-2">تقدير المبيعات الشهرية (جنيه)</h4>
              <G2>
                <Row label="تقدير الاخصائي"><Inp type="number" value={data.sales_specialist} onChange={v=>set('sales_specialist',v)}/></Row>
                <Row label="تقدير المستعلم"><Inp type="number" value={data.sales_investigator} onChange={v=>set('sales_investigator',v)}/></Row>
                <Row label="تقدير مدير المشروعات"><Inp type="number" value={data.sales_manager} onChange={v=>set('sales_manager',v)}/></Row>
                <Row label="المصروفات الشهرية الإجمالية"><Inp type="number" value={data.monthly_expenses} onChange={v=>set('monthly_expenses',v)}/></Row>
                <Row label="إثبات المبيعات"><Sel value={data.sales_proof} onChange={v=>set('sales_proof',v)} options={['فواتير ورقية','فواتير إلكترونية','فواتير جزئية','لا يوجد']}/></Row>
                <Row label="إثبات المشتريات"><Sel value={data.purchases_proof} onChange={v=>set('purchases_proof',v)} options={['فواتير ورقية','فواتير إلكترونية','فواتير جزئية','لا يوجد']}/></Row>
              </G2>
              <h4 className="text-sm font-bold text-navy-700 mt-4 mb-3 border-b pb-2">تقدير رأس المال (جنيه)</h4>
              <G2>
                <Row label="تقدير الاخصائي"><Inp type="number" value={data.capital_specialist} onChange={v=>set('capital_specialist',v)}/></Row>
                <Row label="تقدير المستعلم"><Inp type="number" value={data.capital_investigator} onChange={v=>set('capital_investigator',v)}/></Row>
                <Row label="تقدير مدير المشروعات"><Inp type="number" value={data.capital_manager} onChange={v=>set('capital_manager',v)}/></Row>
              </G2>
            </Card>
          </div>

          <div id="section-guarantors">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">بيانات الضامنين</h2>
            {[1,2].map(n=>(
              <Card key={n}>
                <h4 className="text-sm font-bold text-navy-700 mb-3">الضامن {n===1?'الأول (ض١)':'الثاني (ض٢)'}</h4>
                <G2>
                  <Row label="الاسم"><Inp value={data[`g${n}_name`]} onChange={v=>set(`g${n}_name`,v)}/></Row>
                  <Row label="السن"><Inp type="number" value={data[`g${n}_age`]} onChange={v=>set(`g${n}_age`,v)}/></Row>
                  <Row label="الصلة بالعميل"><Sel value={data[`g${n}_relation`]} onChange={v=>set(`g${n}_relation`,v)} options={RELATIONS}/></Row>
                  <Row label="الوظيفة"><Sel value={data[`g${n}_job`]} onChange={v=>set(`g${n}_job`,v)} options={JOBS}/></Row>
                  <Row label="جهة العمل"><Inp value={data[`g${n}_employer`]} onChange={v=>set(`g${n}_employer`,v)}/></Row>
                  <Row label="ملكية السكن"><Sel value={data[`g${n}_residence`]} onChange={v=>set(`g${n}_residence`,v)} options={['ملك','إيجار','مع العائلة']}/></Row>
                </G2>
                <Toggle label="لديه مديونيات قائمة" value={data[`g${n}_has_debts`]} onChange={v=>set(`g${n}_has_debts`,v)}/>
              </Card>
            ))}
          </div>

          <div id="section-calls">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">المكالمات التليفونية</h2>
            {[{key:'client',label:'مكالمة العميل'},{key:'g1',label:'مكالمة الضامن الأول'},{key:'g2',label:'مكالمة الضامن الثاني'}].map(({key,label})=>(
              <Card key={key}>
                <Toggle label={label} value={data[`${key}_called`]} onChange={v=>set(`${key}_called`,v)}/>
                {data[`${key}_called`]&&(
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Row label="نتيجة المكالمة"><Sel value={data[`${key}_call_result`]} onChange={v=>set(`${key}_call_result`,v)} options={CALL_RESULTS}/></Row>
                    <Row label="ملاحظات"><textarea value={data[`${key}_call_notes`]||''} onChange={e=>set(`${key}_call_notes`,e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>
                  </div>
                )}
              </Card>
            ))}
            <Card>
              <Toggle label="مكالمة الموردين" value={data.suppliers_called} onChange={v=>set('suppliers_called',v)}/>
              {data.suppliers_called&&(<div className="mt-3"><Row label="ملاحظات الموردين"><textarea value={data.suppliers_notes||''} onChange={e=>set('suppliers_notes',e.target.value)} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row></div>)}
            </Card>
          </div>

          <div id="section-scoring">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">نموذج التسعير الاسترشادي</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-navy-900 text-white"><th className="px-3 py-2 text-right w-48">العامل</th><th className="px-3 py-2 text-center w-44">التقييم</th><th className="px-3 py-2 text-center w-16">الدرجة</th></tr></thead>
                  <tbody>
                    {SC_ROWS.map(row=>(
                      <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-700">{row.label}</td>
                        <td className="px-3 py-2"><select value={String(data[row.key]||0)} onChange={e=>set(row.key,Number(e.target.value))} className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy-400"><option value="0">اختر...</option>{row.opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></td>
                        <td className="px-3 py-2 text-center font-bold text-navy-700">{data[row.key]||0}</td>
                      </tr>
                    ))}
                    <tr className="bg-navy-900 text-white"><td colSpan={2} className="px-3 py-2 font-bold">إجمالي درجات نموذج التسعير</td><td className="px-3 py-2 text-center font-bold">{SC_KEYS.reduce((s,k)=>s+(Number(data[k])||0),0)}</td></tr>
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div id="section-fivecs">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">تقييم الجدارة الائتمانية — 5Cs</h2>
            <div className={`rounded-xl p-4 mb-4 border ${scores.total>=20?'bg-emerald-50 border-emerald-200':scores.total>=15?'bg-amber-50 border-amber-200':'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-center">
                <div><p className="font-bold">إجمالي الدرجات: {scores.total.toFixed(1)} / 24.5</p><p className={`text-sm font-semibold mt-0.5 ${scoreColor}`}>{scoreLabel}</p></div>
                <div className="text-left"><p className="text-xs text-gray-500">المبلغ الموصى به آلياً:</p><p className="font-bold text-navy-800">{autoAmount(scores.total).toLocaleString('ar-EG')} جنيه</p></div>
              </div>
            </div>
            {Object.entries(FIVE_CS_ITEMS).map(([cKey,c])=>{
              const sectionScore=c.items.reduce((sum,i)=>sum+(Number(data[i.key])||0),0)
              return(
                <Card key={cKey}>
                  <div className="flex justify-between items-center mb-3"><h4 className="font-bold text-navy-700">{c.label}</h4><span className="text-sm font-bold text-navy-800">{sectionScore.toFixed(1)} / {c.max}</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden"><div className="h-full bg-navy-700 rounded-full transition-all" style={{width:`${Math.min(100,(sectionScore/c.max)*100)}%`}}/></div>
                  <div className="flex flex-col gap-2">
                    {c.items.map(item=>(
                      <div key={item.key} className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 flex-1">{item.label} <span className="text-gray-300">({item.max})</span></span>
                        <select value={String(data[item.key]||0)} onChange={e=>set(item.key,Number(e.target.value))} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-navy-400 w-52"><option value="0">اختر...</option>{item.options.map(o=><option key={o.val} value={o.val}>{o.label} ({o.val})</option>)}</select>
                        <span className="w-8 text-center font-bold text-navy-700 text-sm">{data[item.key]||0}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>

          <div id="section-decision">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">القرار النهائي</h2>
            <Card>
              <G2>
                <Row label="القرار"><Sel value={data.analyst_decision} onChange={v=>set('analyst_decision',v)} options={DECISIONS}/></Row>
                <Row label="المبلغ الموصى به (جنيه)"><Inp type="number" value={data.recommended_amount||autoAmount(scores.total)} onChange={v=>set('recommended_amount',v)}/></Row>
                <Row label="اسم مسؤول المخاطر"><Inp value={data.analyst_name} onChange={v=>set('analyst_name',v)} placeholder="الاسم بالكامل"/></Row>
              </G2>
            </Card>
            <Card>
              <h4 className="font-bold text-navy-700 mb-3">الضمانات المطلوبة</h4>
              <div className="grid grid-cols-3 gap-2">
                {COLLATERAL_OPTIONS.map(item=>(
                  <button key={item} onClick={()=>toggleItem('collaterals',item)} className={`text-sm px-3 py-2 rounded-lg border transition-colors text-right ${data.collaterals.includes(item)?'bg-navy-800 text-white border-navy-800':'bg-white text-gray-600 border-gray-200 hover:border-navy-400'}`}>
                    {data.collaterals.includes(item)?'✓ ':''}{item}
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <h4 className="font-bold text-navy-700 mb-3">الاستيفاءات المطلوبة</h4>
              <div className="flex flex-col gap-2">
                {FIXED_FULFILLMENTS.map((item,i)=>(
                  <button key={i} onClick={()=>toggleItem('fulfillments',item)} className={`text-sm px-3 py-2.5 rounded-lg border text-right flex items-start gap-2 transition-colors ${data.fulfillments.includes(item)?'bg-emerald-50 text-emerald-800 border-emerald-300':'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    <span className="flex-shrink-0 font-bold">{data.fulfillments.includes(item)?'✓':'○'}</span><span>{item}</span>
                  </button>
                ))}
              </div>
            </Card>
            <Card>
              <Row label="ملاحظات إضافية من المحلل"><textarea value={data.analyst_notes||''} onChange={e=>set('analyst_notes',e.target.value)} rows={4} placeholder="أي ملاحظات أو تحفظات..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/></Row>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
