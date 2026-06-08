import { useState, useEffect } from 'react'
import { supabase, N8N_ANALYZE_WEBHOOK, formatAmount } from '../../supabase'
import { useToast } from '../../components/Toast'
import { Save, ChevronLeft, Plus, Trash2 } from 'lucide-react'

const RELATIONS = ['زوجة', 'زوج', 'أخ', 'أخت', 'ابن', 'ابنة', 'صديق', 'شريك', 'جار', 'أخرى']
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

const MAX_SCORE = 24.5

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
    { key: 'col_bank_cheques', label: 'شيكات بنكية / بريدية', max: 1, options: [{label:'يوجد',val:1},{label:'جزئي',val:0.5},{label:'لا يوجد',val:0}] },
    { key: 'col_guarantee_cheques', label: 'شيكات ضمان', max: 0.5, options: [{label:'يوجد',val:0.5},{label:'لا يوجد',val:0}] },
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
  {id:'client',label:'بيانات العميل'},
  {id:'bank',label:'كشف الحساب'},
  {id:'visit',label:'الزيارة الميدانية'},
  {id:'guarantors',label:'الضامنون'},
  {id:'calls',label:'المكالمات'},
  {id:'fivecs',label:'تقييم الجدارة'},
  {id:'decision',label:'القرار النهائي'},
]

function Row({label,children}){return(<div><label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>{children}</div>)}
function G2({children}){return(<div className="grid grid-cols-2 gap-3">{children}</div>)}
function Card({children,title}){return(<div className="bg-white rounded-xl border border-gray-100 p-5 mb-4 shadow-sm">{title&&<h4 className="text-sm font-bold text-navy-700 mb-3 border-b pb-2">{title}</h4>}{children}</div>)}
function Sel({value,onChange,options,placeholder='اختر...'}){return(<select value={value||''} onChange={e=>onChange(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-400"><option value="">{placeholder}</option>{options.map(o=>(<option key={typeof o==='string'?o:o.value} value={typeof o==='string'?o:o.value}>{typeof o==='string'?o:o.label}</option>))}</select>)}
function Inp({value,onChange,type='text',placeholder=''}){return(<input type={type} value={value||''} placeholder={placeholder} onChange={e=>onChange(type==='number'?(e.target.value===''?'':Number(e.target.value)):e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-navy-400"/>)}
function Toggle({label,value,onChange}){return(<div className="flex items-center justify-between py-2"><span className="text-sm text-gray-700">{label}</span><div onClick={()=>onChange(!value)} className={`w-12 h-6 rounded-full cursor-pointer relative flex-shrink-0 transition-colors ${value?'bg-emerald-500':'bg-gray-300'}`}><div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all duration-200 ${value?'right-0.5':'left-0.5'}`}/></div></div>)}
function TA({value,onChange,rows=2,placeholder=''}){return(<textarea value={value||''} onChange={e=>onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-400 mt-1"/>)}

const EMPTY_MONTH = {month:'',credit:'',debit:'',balance:'',notes:''}
const INIT_BANK = {bank_name:'',account_type:'',period:'',avg_balance:'',has_returned_checks:false,returned_checks_details:'',has_late_fees:false,late_fees_details:'',has_loans_on_statement:false,loans_details:'',self_transfers:'',empty_months:'',notes:'',monthly_details:[{...EMPTY_MONTH},{...EMPTY_MONTH},{...EMPTY_MONTH},{...EMPTY_MONTH},{...EMPTY_MONTH},{...EMPTY_MONTH}]}

const INIT = {
  client_age:'',
  client_financial_assets:'',
  operation_rating:'',employee_count:'',legal_status:'',business_ownership:'',residence_ownership:'',has_tools:false,has_leverage:false,
  sales_specialist:'',sales_investigator:'',sales_manager:'',sales_proof:'',purchases_proof:'',monthly_expenses:'',
  capital_specialist:'',capital_investigator:'',capital_manager:'',
  g1_name:'',g1_age:'',g1_relation:'',g1_employer:'',
  g2_name:'',g2_age:'',g2_relation:'',g2_employer:'',
  client_called:false,client_call_result:'',client_call_notes:'',
  g1_called:false,g1_call_result:'',g1_call_notes:'',
  g2_called:false,g2_call_result:'',g2_call_notes:'',
  suppliers_called:false,suppliers_notes:'',
  c_education:0,c_trust:0,c_job:0,c_residence:0,c_business_stability:0,
  cr_personal_banks:0,cr_business_banks:0,cr_companies:0,cr_bank_regularity:0,cr_companies_regularity:0,cr_current_loans:0,cr_inquiries:0,
  col_guarantors:0,col_ecr:0,col_bank_cheques:0,col_guarantee_cheques:0,col_client_insurance:0,col_guarantor_insurance:0,
  cap_leverage:0,cap_business_ownership:0,cap_residence:0,cap_tools:0,
  cond_operation:0,cond_employees:0,cond_legal:0,
  analyst_decision:'',recommended_amount:'',collaterals:[],fulfillments:[],analyst_notes:'',analyst_name:'',
  ai_iscore_grade:'',ai_iscore_score:'',ai_outstanding_loans:'',ai_returned_cheques:false,
  ai_ecr_value:'',ai_monthly_sales:'',ai_monthly_purchases:'',ai_iscore_notes:'',
  ai_inquiries_count:'',
}

const n=(v)=>v===''||v===null||v===undefined?null:Number(v)||null
const clean=(v)=>String(v||'').trim()
const list=(v)=>Array.isArray(v)?v.filter(Boolean):[]

function interestRateFor(amount){
  const a=Number(amount)||0
  if(a<=1000000)return 22.5
  if(a<=5000000)return 21
  return 20
}

function gradeFromRiskScore(score){
  if(score>=85)return 'A'
  if(score>=75)return 'B'
  if(score>=65)return 'C'
  if(score>=55)return 'D'
  if(score>=45)return 'E'
  return 'F'
}

export default function AnalystDrawer({application,onClose,onSaved}){
  const [data,setData]=useState(INIT)
  const [bank,setBank]=useState(INIT_BANK)
  const [saving,setSaving]=useState(false)
  const [existingId,setExistingId]=useState(null)
  const [activeSection,setActiveSection]=useState('client')
  const [newCollateral,setNewCollateral]=useState('')
  const [newFulfillment,setNewFulfillment]=useState('')
  const toast=useToast()
  const set=(k,v)=>setData(p=>({...p,[k]:v}))
  const setB=(k,v)=>setBank(p=>({...p,[k]:v}))

  useEffect(()=>{loadExisting()},[application.id])

  async function loadExisting(){
    const {data:ex}=await supabase.from('analyst_assessments').select('*').eq('application_id',application.id).maybeSingle()
    if(ex){
      setExistingId(ex.id)
      const d=ex.five_cs_details||{}
      setData(p=>({...p,...ex,...d,
        collaterals:ex.collaterals?ex.collaterals.split(',').filter(Boolean):[],
        fulfillments:ex.fulfillments?ex.fulfillments.split('||').filter(Boolean):[],
      }))
      if(ex.bank_statement_data&&Object.keys(ex.bank_statement_data).length>0){
        const bd=ex.bank_statement_data
        setBank({...INIT_BANK,...bd,monthly_details:bd.monthly_details&&bd.monthly_details.length>0?bd.monthly_details:INIT_BANK.monthly_details})
      }
    }
  }

  function updateMonth(idx,field,value){setBank(p=>{const m=[...p.monthly_details];m[idx]={...m[idx],[field]:value};return{...p,monthly_details:m}})}
  function addMonth(){setBank(p=>({...p,monthly_details:[...p.monthly_details,{...EMPTY_MONTH}]}))}
  function removeMonth(idx){setBank(p=>({...p,monthly_details:p.monthly_details.filter((_,i)=>i!==idx)}))}

  function calcAvgCredit(){
    const filled=bank.monthly_details.filter(m=>m.credit!==''&&m.credit!==null)
    if(filled.length===0)return 0
    return Math.round(filled.reduce((s,m)=>s+Number(m.credit||0),0)/filled.length)
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

  function addCustomItem(key,value,clear){
    const item=clean(value)
    if(!item)return
    setData(p=>p[key].includes(item)?p:{...p,[key]:[...p[key],item]})
    clear('')
  }

  function validateBeforeSave(scores){
    if(!data.analyst_decision)return 'اختر القرار النهائي قبل توليد التحليل'
    if(!clean(data.analyst_name))return 'اكتب اسم مسؤول المخاطر'
    const amount=n(data.recommended_amount)||autoAmount(scores.total)
    if(data.analyst_decision!=='رفض'&&!amount)return 'حدد المبلغ الموصى به أو أكمل تقييم الجدارة'
    return null
  }

  function buildLocalDecision(payload,scores,bankData){
    const recommendedAmount=payload.recommended_amount||autoAmount(scores.total)||null
    const riskScore=Math.round((scores.total/MAX_SCORE)*100)
    const riskGrade=gradeFromRiskScore(riskScore)
    const fraudFlags=[
      payload.ai_returned_cheques?'يوجد شيكات مرتجعة أو تعثر في الايسكور':null,
      bankData.has_returned_checks?'يوجد شيكات مرتدة في كشف الحساب':null,
      bankData.has_late_fees?'يوجد غرامات تأخير في كشف الحساب':null,
      bankData.self_transfers?'يوجد تحويلات ذاتية تحتاج تفسير':null,
    ].filter(Boolean)
    const missingData=[
      !payload.client_age?'سن العميل غير مسجل':null,
      !payload.ai_iscore_grade?'تصنيف الايسكور غير مسجل':null,
      !payload.ai_iscore_score?'الدرجة الرقمية للايسكور غير مسجلة':null,
      !bankData.bank_name?'بيانات كشف الحساب غير مكتملة':null,
      !payload.g1_name?'بيانات الضامن الأول غير مكتملة':null,
      !payload.analyst_notes?'ملاحظات المحلل غير مسجلة':null,
    ].filter(Boolean)
    const strengths=[
      scores.char>=4?'شخصية العميل مستقرة وفق تقييم 5Cs':null,
      scores.credit>=4?'تاريخ ائتماني مقبول':null,
      scores.col>=3?'ضمانات مناسبة لحجم التمويل':null,
      scores.cap>=4?'رأس المال والملاءة يدعمان الطلب':null,
      scores.cond>=4?'ظروف النشاط والوضع القانوني مناسبة':null,
      payload.ai_monthly_sales?'تم تسجيل مبيعات شهرية مثبتة':null,
    ].filter(Boolean)
    const weaknesses=[
      scores.char<3?'تقييم شخصية العميل يحتاج تدعيم':null,
      scores.credit<3?'التاريخ الائتماني يحتاج مراجعة إضافية':null,
      scores.col<2.5?'الضمانات المتاحة محدودة':null,
      scores.cap<3?'رأس المال أو ملكية النشاط غير كافية بالكامل':null,
      scores.cond<3?'ظروف التشغيل أو الوضع القانوني تحتاج استيفاء':null,
      bankData.empty_months?'توجد شهور بدون معاملات في كشف الحساب':null,
    ].filter(Boolean)
    const threats=[
      fraudFlags.length?'مؤشرات مخاطر تستلزم تحقق قبل التوقيع':null,
      payload.ai_outstanding_loans?'توجد التزامات قائمة يجب احتسابها ضمن القدرة على السداد':null,
      bankData.has_loans_on_statement?'توجد تمويلات ظاهرة على كشف الحساب':null,
    ].filter(Boolean)
    const guarantors=[
      payload.g1_name?`${payload.g1_name} — ${payload.g1_relation||'صلة غير محددة'} — ${payload.g1_employer||'بيانات العباءة المالية غير مكتملة'}`:null,
      payload.g2_name?`${payload.g2_name} — ${payload.g2_relation||'صلة غير محددة'} — ${payload.g2_employer||'بيانات العباءة المالية غير مكتملة'}`:null,
    ].filter(Boolean)
    const creditMemo={
      signatory:'العميل منفرداً',
      approved_amount_text:recommendedAmount?formatAmount(recommendedAmount):'—',
      tenor_text:application.tenor_months?`${application.tenor_months} شهر`:'—',
      purpose:application.purpose||'—',
      guarantors,
      guarantor1_text:guarantors[0]||'',
      guarantor2_text:guarantors[1]||'',
      guarantor3_text:'لا يوجد',
      fulfillments:list(data.fulfillments),
      collaterals:list(data.collaterals),
    }
    const generatedMemo=[
      'جواب المخاطر',
      '',
      `اسم العميل: ${application.client_name_ar||'—'}`,
      `رقم الملف: ${application.reference_code||'—'}`,
      `الفرع: ${application.branch||'—'}`,
      `نوع التمويل: ${application.product_type||'—'}`,
      `المبلغ المطلوب: ${formatAmount(application.requested_amount)}`,
      `المبلغ الموصى به: ${recommendedAmount?formatAmount(recommendedAmount):'—'}`,
      `مدة التمويل: ${application.tenor_months||'—'} شهر`,
      `درجة المخاطر: ${riskGrade} (${riskScore}/100)`,
      `قرار مسؤول المخاطر: ${payload.analyst_decision}`,
      '',
      'نقاط القوة:',
      strengths.length?strengths.map((s,i)=>`${i+1}. ${s}`).join('\n'):'لا توجد نقاط قوة مسجلة.',
      '',
      'نقاط الضعف والمخاطر:',
      weaknesses.length?weaknesses.map((s,i)=>`${i+1}. ${s}`).join('\n'):'لا توجد نقاط ضعف جوهرية مسجلة.',
      '',
      'الضمانات المطلوبة:',
      creditMemo.collaterals.length?creditMemo.collaterals.map((s,i)=>`${i+1}. ${s}`).join('\n'):'لا توجد ضمانات إضافية مسجلة.',
      '',
      'الاستيفاءات المطلوبة قبل التوقيع:',
      creditMemo.fulfillments.length?creditMemo.fulfillments.map((s,i)=>`${i+1}. ${s}`).join('\n'):'لا توجد استيفاءات مسجلة.',
      '',
      `مسؤول المخاطر: ${payload.analyst_name||'—'}`,
      payload.analyst_notes?`ملاحظات المحلل: ${payload.analyst_notes}`:'',
    ].filter(line=>line!==null).join('\n')

    return{
      application_id:application.id,
      risk_score:riskScore,
      risk_grade:riskGrade,
      recommendation:payload.analyst_decision,
      recommended_amount:recommendedAmount,
      recommended_tenor:application.tenor_months||null,
      interest_rate:recommendedAmount?interestRateFor(recommendedAmount):null,
      strengths:strengths.join('\n')||'لا توجد نقاط قوة مسجلة.',
      weaknesses:weaknesses.join('\n')||'لا توجد نقاط ضعف جوهرية مسجلة.',
      threats:threats.join('\n')||'لا توجد تهديدات إضافية مسجلة.',
      fraud_flags:fraudFlags,
      missing_documents:[],
      missing_data:missingData,
      credit_memo_data:creditMemo,
      generated_memo:generatedMemo,
      status:'pending_review',
      generated_at:new Date().toISOString(),
    }
  }

  async function saveLocalDecision(payload,scores,bankData){
    const localDecision=buildLocalDecision(payload,scores,bankData)
    const {data:existing}=await supabase
      .from('risk_decision')
      .select('id')
      .eq('application_id',application.id)
      .order('generated_at',{ascending:false})
      .limit(1)
      .maybeSingle()
    const decisionResult=existing
      ? await supabase.from('risk_decision').update(localDecision).eq('id',existing.id)
      : await supabase.from('risk_decision').insert(localDecision)
    if(decisionResult.error)throw decisionResult.error
    await supabase
      .from('applications')
      .update({status:'pending_approval',risk_grade:localDecision.risk_grade})
      .eq('id',application.id)
  }

  async function handleSave(){
    setSaving(true)
    const scores=calcScores()
    const validationError=validateBeforeSave(scores)
    if(validationError){
      toast(validationError,'error')
      setSaving(false)
      return
    }
    const five_cs_details={}
    Object.values(FIVE_CS_ITEMS).forEach(c=>c.items.forEach(i=>{five_cs_details[i.key]=data[i.key]||0}))
    const bankData={...bank,avg_balance:bank.avg_balance||calcAvgCredit()}

    const payload={
      application_id:application.id,
      client_age:n(data.client_age),
      client_financial_assets:data.client_financial_assets||null,
      operation_rating:data.operation_rating||null,
      employee_count:data.employee_count||null,
      legal_status:data.legal_status||null,
      business_ownership:data.business_ownership||null,
      residence_ownership:data.residence_ownership||null,
      has_tools:data.has_tools,
      has_leverage:data.has_leverage,
      sales_specialist:n(data.sales_specialist),
      sales_investigator:n(data.sales_investigator),
      sales_manager:n(data.sales_manager),
      sales_proof:data.sales_proof||null,
      purchases_proof:data.purchases_proof||null,
      monthly_expenses:n(data.monthly_expenses),
      capital_specialist:n(data.capital_specialist),
      capital_investigator:n(data.capital_investigator),
      capital_manager:n(data.capital_manager),
      g1_name:data.g1_name||null,
      g1_age:n(data.g1_age),
      g1_relation:data.g1_relation||null,
      g1_employer:data.g1_employer||null,
      g2_name:data.g2_name||null,
      g2_age:n(data.g2_age),
      g2_relation:data.g2_relation||null,
      g2_employer:data.g2_employer||null,
      client_called:data.client_called,
      client_call_result:data.client_call_result||null,
      client_call_notes:data.client_call_notes||null,
      g1_called:data.g1_called,
      g1_call_result:data.g1_call_result||null,
      g1_call_notes:data.g1_call_notes||null,
      g2_called:data.g2_called,
      g2_call_result:data.g2_call_result||null,
      g2_call_notes:data.g2_call_notes||null,
      suppliers_called:data.suppliers_called,
      suppliers_notes:data.suppliers_notes||null,
      five_cs_details,
      score_character:scores.char,
      score_credit_history:scores.credit,
      score_collateral:scores.col,
      score_capital:scores.cap,
      score_conditions:scores.cond,
      total_score:scores.total,
      ai_iscore_grade:data.ai_iscore_grade||null,
      ai_iscore_score:n(data.ai_iscore_score),
      ai_outstanding_loans:n(data.ai_outstanding_loans),
      ai_returned_cheques:data.ai_returned_cheques,
      ai_ecr_value:n(data.ai_ecr_value),
      ai_monthly_sales:n(data.ai_monthly_sales),
      ai_monthly_purchases:n(data.ai_monthly_purchases),
      ai_iscore_notes:data.ai_iscore_notes||null,
      ai_inquiries_count:n(data.ai_inquiries_count),
      analyst_decision:data.analyst_decision||null,
      analyst_name:data.analyst_name||null,
      analyst_notes:data.analyst_notes||null,
      collaterals:data.collaterals.join(','),
      fulfillments:data.fulfillments.join('||'),
      recommended_amount:n(data.recommended_amount)||autoAmount(scores.total)||null,
      bank_statement_data:bankData,
      updated_at:new Date().toISOString(),
    }

    let error
    if(existingId){const res=await supabase.from('analyst_assessments').update(payload).eq('id',existingId);error=res.error}
    else{const res=await supabase.from('analyst_assessments').insert(payload).select().single();error=res.error;if(res.data)setExistingId(res.data.id)}

    if(error){toast('خطأ: '+error.message,'error')}
    else{
      try{
        await saveLocalDecision(payload,scores,bankData)
        fetch(N8N_ANALYZE_WEBHOOK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({application_id:application.id})}).catch(()=>{})
        toast('تم حفظ التقييم وتوليد جواب المخاطر ✓','success')
        onSaved?.()
      }catch(decisionError){
        toast('تم حفظ التقييم، لكن تعذر توليد القرار: '+decisionError.message,'error')
      }
    }
    setSaving(false)
  }

  const scores=calcScores()
  const scoreLabel=scores.total>=20?'موافقة بنفس المبلغ':scores.total>=15?'موافقة بتخفيض 25%':scores.total>=10?'تخفيض 50%':'رفض قطعاً'
  const scoreColor=scores.total>=20?'text-emerald-400':scores.total>=15?'text-amber-400':scores.total>=10?'text-orange-400':'text-red-400'
  const avgCredit=calcAvgCredit()

  return(
    <div className="fixed inset-0 z-50 bg-gray-100" dir="rtl">
      <div className="bg-navy-900 text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="text-navy-300 hover:text-white flex items-center gap-1 text-sm"><ChevronLeft size={16}/>رجوع</button>
          <div><span className="font-bold">{application.client_name_ar}</span><span className="text-navy-400 text-sm mx-2">—</span><span className="text-navy-300 text-sm">{application.reference_code}</span></div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${scoreColor}`}>الإجمالي: {scores.total.toFixed(1)} — {scoreLabel}</span>
          <button onClick={handleSave} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-navy-950 font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
            <Save size={14}/>{saving?'جاري الحفظ والتحليل...':'حفظ وتوليد التحليل'}
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

          {/* CLIENT SECTION */}
          <div id="section-client">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">بيانات العميل والايسكور</h2>
            <Card title="بيانات أساسية">
              <G2>
                <Row label="سن العميل"><Inp type="number" value={data.client_age} onChange={v=>set('client_age',v)} placeholder="مثال: 41"/></Row>
                <Row label="التصنيف الائتماني (A-F)"><Inp value={data.ai_iscore_grade} onChange={v=>set('ai_iscore_grade',v)} placeholder="A"/></Row>
                <Row label="الدرجة الرقمية"><Inp type="number" value={data.ai_iscore_score} onChange={v=>set('ai_iscore_score',v)} placeholder="750"/></Row>
                <Row label="عدد الاستعلامات"><Inp type="number" value={data.ai_inquiries_count} onChange={v=>set('ai_inquiries_count',v)}/></Row>
                <Row label="إجمالي الالتزامات القائمة (جنيه)"><Inp type="number" value={data.ai_outstanding_loans} onChange={v=>set('ai_outstanding_loans',v)}/></Row>
                <Row label="قيمة الرهن الحيازي (جنيه)"><Inp type="number" value={data.ai_ecr_value} onChange={v=>set('ai_ecr_value',v)}/></Row>
              </G2>
              <Toggle label="يوجد شيكات مرتجعة أو تعثر في الايسكور" value={data.ai_returned_cheques} onChange={v=>set('ai_returned_cheques',v)}/>
              <div className="mt-3">
                <Row label="تفاصيل الالتزامات والتاريخ الائتماني">
                  <TA value={data.ai_iscore_notes} onChange={v=>set('ai_iscore_notes',v)} rows={4} placeholder="اكتب تفاصيل كل قرض: الجهة، المبلغ، المدة، الحالة، التأخيرات إن وجدت..."/>
                </Row>
              </div>
            </Card>

            <Card title="العباءات المالية للعميل — الملاءة المالية المثبتة">
              <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-3">طبقاً للائحة يجب وجود ملاءة مالية مثبتة (أرض / عقار / سيارات / ملكية النشاط). اذكر التفاصيل بدقة.</p>
              <Row label="تفاصيل العباءات والملاءة المالية للعميل">
                <TA value={data.client_financial_assets} onChange={v=>set('client_financial_assets',v)} rows={5}
                  placeholder="مثال: &#10;- شقة سكنية بالقاهرة ملك تام 180 متر (مثبتة بعقد تمليك)&#10;- سيارة X نوع Y موديل Z رقم لوحة ...&#10;- ملكية النشاط (مخزن / محل)&#10;- أرض زراعية بالمحافظة X مساحة Y فدان"/>
              </Row>
            </Card>

            <Card>
              <G2>
                <Row label="المبيعات الشهرية المثبتة (جنيه)"><Inp type="number" value={data.ai_monthly_sales} onChange={v=>set('ai_monthly_sales',v)}/></Row>
                <Row label="المشتريات الشهرية (جنيه)"><Inp type="number" value={data.ai_monthly_purchases} onChange={v=>set('ai_monthly_purchases',v)}/></Row>
              </G2>
            </Card>
          </div>

          {/* BANK STATEMENT SECTION */}
          <div id="section-bank">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">كشف الحساب البنكي</h2>
            <Card>
              <G2>
                <Row label="اسم البنك"><Inp value={bank.bank_name} onChange={v=>setB('bank_name',v)} placeholder="مثال: بنك مصر"/></Row>
                <Row label="نوع الحساب"><Sel value={bank.account_type} onChange={v=>setB('account_type',v)} options={['حساب شخصي','حساب منشأة','حساب جاري','حساب توفير']}/></Row>
                <Row label="فترة الكشف"><Inp value={bank.period} onChange={v=>setB('period',v)} placeholder="يناير 2025 — يونيو 2025"/></Row>
                <Row label="متوسط الرصيد الشهري (جنيه)"><Inp type="number" value={bank.avg_balance} onChange={v=>setB('avg_balance',v)}/></Row>
              </G2>
            </Card>

            <Card title="المعاملات الشهرية — آخر 6 شهور على الأقل">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-600">
                      <th className="text-right px-3 py-2 font-semibold">الشهر</th>
                      <th className="text-right px-3 py-2 font-semibold">الدائن (جنيه)</th>
                      <th className="text-right px-3 py-2 font-semibold">المدين (جنيه)</th>
                      <th className="text-right px-3 py-2 font-semibold">الرصيد الختامي</th>
                      <th className="text-right px-3 py-2 font-semibold">ملاحظات</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bank.monthly_details.map((m,i)=>(
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5"><input value={m.month||''} onChange={e=>updateMonth(i,'month',e.target.value)} placeholder="يناير 2025" className="w-28 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-400"/></td>
                        <td className="px-2 py-1.5"><input type="number" value={m.credit||''} onChange={e=>updateMonth(i,'credit',e.target.value===''?'':Number(e.target.value))} className="w-32 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-400"/></td>
                        <td className="px-2 py-1.5"><input type="number" value={m.debit||''} onChange={e=>updateMonth(i,'debit',e.target.value===''?'':Number(e.target.value))} className="w-32 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-400"/></td>
                        <td className="px-2 py-1.5"><input type="number" value={m.balance||''} onChange={e=>updateMonth(i,'balance',e.target.value===''?'':Number(e.target.value))} className="w-32 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-400"/></td>
                        <td className="px-2 py-1.5"><input value={m.notes||''} onChange={e=>updateMonth(i,'notes',e.target.value)} placeholder="تحويلات ذاتية، غرامات..." className="w-44 border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-navy-400"/></td>
                        <td className="px-2 py-1.5">{bank.monthly_details.length>1&&(<button onClick={()=>removeMonth(i)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between mt-3">
                <button onClick={addMonth} className="flex items-center gap-1 text-sm text-navy-600 hover:text-navy-800 font-medium"><Plus size={14}/>إضافة شهر</button>
                {avgCredit>0&&(<div className="text-sm bg-navy-50 px-3 py-1.5 rounded-lg">متوسط التدفق الدائن: <span className="font-bold text-navy-800">{avgCredit.toLocaleString('ar-EG')} جنيه</span></div>)}
              </div>
            </Card>

            <Card title="مؤشرات المخاطر في كشف الحساب">
              <Toggle label="يوجد شيكات مرتدة" value={bank.has_returned_checks} onChange={v=>setB('has_returned_checks',v)}/>
              {bank.has_returned_checks&&<div className="mt-2"><Row label="تفاصيل الشيكات المرتدة"><TA value={bank.returned_checks_details} onChange={v=>setB('returned_checks_details',v)}/></Row></div>}
              <Toggle label="يوجد غرامات تأخير" value={bank.has_late_fees} onChange={v=>setB('has_late_fees',v)}/>
              {bank.has_late_fees&&<div className="mt-2"><Row label="تفاصيل غرامات التأخير"><TA value={bank.late_fees_details} onChange={v=>setB('late_fees_details',v)}/></Row></div>}
              <Toggle label="يوجد تمويلات مصدرة تظهر على الكشف" value={bank.has_loans_on_statement} onChange={v=>setB('has_loans_on_statement',v)}/>
              {bank.has_loans_on_statement&&<div className="mt-2"><Row label="تفاصيل التمويلات"><TA value={bank.loans_details} onChange={v=>setB('loans_details',v)}/></Row></div>}
              <div className="mt-2">
                <Row label="معاملات من نفس الشخص (تحويلات ذاتية)"><TA value={bank.self_transfers} onChange={v=>setB('self_transfers',v)} placeholder="اذكر إذا كانت هناك تحويلات متكررة من أو لنفس الشخص..."/></Row>
              </div>
              <div className="mt-2">
                <Row label="شهور بدون معاملات"><Inp value={bank.empty_months} onChange={v=>setB('empty_months',v)} placeholder="مثال: أغسطس 2024، نوفمبر 2024"/></Row>
              </div>
              <div className="mt-2">
                <Row label="ملاحظات إضافية على سلوك الحساب"><TA value={bank.notes} onChange={v=>setB('notes',v)} rows={3} placeholder="أي ملاحظات مهمة..."/></Row>
              </div>
            </Card>
          </div>

          {/* VISIT SECTION */}
          <div id="section-visit">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">بيانات الزيارة الميدانية</h2>
            <Card>
              <G2>
                <Row label="انتظام التشغيل"><Sel value={data.operation_rating} onChange={v=>set('operation_rating',v)} options={['ممتاز','جيد','متوسط','ضعيف']}/></Row>
                <Row label="عدد العمالة"><Sel value={data.employee_count} onChange={v=>set('employee_count',v)} options={['1 إلى 5','6 إلى 10','أكثر من 10','بدون عمالة']}/></Row>
                <Row label="الوضع القانوني"><Sel value={data.legal_status} onChange={v=>set('legal_status',v)} options={['مرخص بالكامل','مرخص جزئياً','قيد الاستخراج','غير مرخص']}/></Row>
                <Row label="ملكية محل النشاط"><Sel value={data.business_ownership} onChange={v=>set('business_ownership',v)} options={['ملك تام','إيجار موثق','إيجار غير موثق']}/></Row>
                <Row label="ملكية السكن"><Sel value={data.residence_ownership} onChange={v=>set('residence_ownership',v)} options={['ملك','إيجار','مع العائلة']}/></Row>
                <Row label="إثبات المبيعات"><Sel value={data.sales_proof} onChange={v=>set('sales_proof',v)} options={['فواتير ورقية','فواتير إلكترونية','فواتير جزئية','لا يوجد']}/></Row>
                <Row label="إثبات المشتريات"><Sel value={data.purchases_proof} onChange={v=>set('purchases_proof',v)} options={['فواتير ورقية','فواتير إلكترونية','فواتير جزئية','لا يوجد']}/></Row>
              </G2>
              <Toggle label="يوجد أدوات تخدم النشاط" value={data.has_tools} onChange={v=>set('has_tools',v)}/>
              <Toggle label="يوجد رافعة مالية (ديون تجارية أو بضاعة بالأجل)" value={data.has_leverage} onChange={v=>set('has_leverage',v)}/>
            </Card>
            <Card title="تقديرات المبيعات الشهرية (جنيه)">
              <G2>
                <Row label="تقدير الاخصائي"><Inp type="number" value={data.sales_specialist} onChange={v=>set('sales_specialist',v)}/></Row>
                <Row label="تقدير المستعلم"><Inp type="number" value={data.sales_investigator} onChange={v=>set('sales_investigator',v)}/></Row>
                <Row label="تقدير مدير المشروعات"><Inp type="number" value={data.sales_manager} onChange={v=>set('sales_manager',v)}/></Row>
                <Row label="المصروفات الشهرية الإجمالية"><Inp type="number" value={data.monthly_expenses} onChange={v=>set('monthly_expenses',v)}/></Row>
              </G2>
            </Card>
            <Card title="تقديرات رأس المال (جنيه)">
              <G2>
                <Row label="تقدير الاخصائي"><Inp type="number" value={data.capital_specialist} onChange={v=>set('capital_specialist',v)}/></Row>
                <Row label="تقدير المستعلم"><Inp type="number" value={data.capital_investigator} onChange={v=>set('capital_investigator',v)}/></Row>
                <Row label="تقدير مدير المشروعات"><Inp type="number" value={data.capital_manager} onChange={v=>set('capital_manager',v)}/></Row>
              </G2>
            </Card>
          </div>

          {/* GUARANTORS SECTION */}
          <div id="section-guarantors">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">بيانات الضامنين</h2>
            {[1,2].map(num=>(
              <Card key={num} title={`الضامن ${num===1?'الأول (ض١)':'الثاني (ض٢)'}`}>
                <G2>
                  <Row label="الاسم"><Inp value={data[`g${num}_name`]} onChange={v=>set(`g${num}_name`,v)}/></Row>
                  <Row label="السن"><Inp type="number" value={data[`g${num}_age`]} onChange={v=>set(`g${num}_age`,v)}/></Row>
                  <Row label="الصلة بالعميل"><Sel value={data[`g${num}_relation`]} onChange={v=>set(`g${num}_relation`,v)} options={RELATIONS}/></Row>
                  <Row label="الوظيفة / العباءة المالية"><Inp value={data[`g${num}_employer`]} onChange={v=>set(`g${num}_employer`,v)} placeholder="مثال: موظف ببنك مصر / مدرسة بالحكومة / عقار ملك..."/></Row>
                </G2>
              </Card>
            ))}
          </div>

          {/* CALLS SECTION */}
          <div id="section-calls">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">المكالمات التليفونية</h2>
            {[{key:'client',label:'مكالمة العميل'},{key:'g1',label:'مكالمة الضامن الأول'},{key:'g2',label:'مكالمة الضامن الثاني'}].map(({key,label})=>(
              <Card key={key}>
                <Toggle label={label} value={data[`${key}_called`]} onChange={v=>set(`${key}_called`,v)}/>
                {data[`${key}_called`]&&(
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Row label="نتيجة المكالمة"><Sel value={data[`${key}_call_result`]} onChange={v=>set(`${key}_call_result`,v)} options={CALL_RESULTS}/></Row>
                    <Row label="ملاحظات"><TA value={data[`${key}_call_notes`]} onChange={v=>set(`${key}_call_notes`,v)}/></Row>
                  </div>
                )}
              </Card>
            ))}
            <Card>
              <Toggle label="مكالمة الموردين" value={data.suppliers_called} onChange={v=>set('suppliers_called',v)}/>
              {data.suppliers_called&&<div className="mt-3"><Row label="ملاحظات الموردين"><TA value={data.suppliers_notes} onChange={v=>set('suppliers_notes',v)}/></Row></div>}
            </Card>
          </div>

          {/* 5CS SECTION */}
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

          {/* DECISION SECTION */}
          <div id="section-decision">
            <h2 className="text-base font-bold text-navy-800 bg-navy-50 border-r-4 border-gold-500 px-4 py-3 rounded-lg mb-4">القرار النهائي</h2>
            <Card>
              <G2>
                <Row label="القرار"><Sel value={data.analyst_decision} onChange={v=>set('analyst_decision',v)} options={DECISIONS}/></Row>
                <Row label="المبلغ الموصى به (جنيه)"><Inp type="number" value={data.recommended_amount||autoAmount(scores.total)} onChange={v=>set('recommended_amount',v)}/></Row>
                <Row label="اسم مسؤول المخاطر"><Inp value={data.analyst_name} onChange={v=>set('analyst_name',v)} placeholder="الاسم بالكامل"/></Row>
              </G2>
            </Card>
            <Card title="الضمانات المطلوبة">
              <div className="grid grid-cols-3 gap-2">
                {COLLATERAL_OPTIONS.map(item=>(
                  <button key={item} onClick={()=>toggleItem('collaterals',item)} className={`text-sm px-3 py-2 rounded-lg border transition-colors text-right ${data.collaterals.includes(item)?'bg-navy-800 text-white border-navy-800':'bg-white text-gray-600 border-gray-200 hover:border-navy-400'}`}>
                    {data.collaterals.includes(item)?'✓ ':''}{item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Inp value={newCollateral} onChange={setNewCollateral} placeholder="ضمان آخر..." />
                <button onClick={()=>addCustomItem('collaterals',newCollateral,setNewCollateral)} className="btn-ghost flex items-center gap-1 whitespace-nowrap">
                  <Plus size={14}/>إضافة
                </button>
              </div>
            </Card>
            <Card title="الاستيفاءات المطلوبة">
              <div className="flex flex-col gap-2">
                {FIXED_FULFILLMENTS.map((item,i)=>(
                  <button key={i} onClick={()=>toggleItem('fulfillments',item)} className={`text-sm px-3 py-2.5 rounded-lg border text-right flex items-start gap-2 transition-colors ${data.fulfillments.includes(item)?'bg-emerald-50 text-emerald-800 border-emerald-300':'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    <span className="flex-shrink-0 font-bold">{data.fulfillments.includes(item)?'✓':'○'}</span><span>{item}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <Inp value={newFulfillment} onChange={setNewFulfillment} placeholder="استيفاء آخر..." />
                <button onClick={()=>addCustomItem('fulfillments',newFulfillment,setNewFulfillment)} className="btn-ghost flex items-center gap-1 whitespace-nowrap">
                  <Plus size={14}/>إضافة
                </button>
              </div>
            </Card>
            <Card>
              <Row label="ملاحظات إضافية من المحلل"><TA value={data.analyst_notes} onChange={v=>set('analyst_notes',v)} rows={4} placeholder="أي ملاحظات أو تحفظات..."/></Row>
            </Card>
          </div>

        </div>
      </div>
    </div>
  )
}
