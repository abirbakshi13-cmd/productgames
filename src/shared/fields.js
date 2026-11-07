// Single source of answer options. Shared by A's onboarding and B's ask-in-context
// so both produce identical profile values.

export const FIELD_OPTIONS = {
  ageRange:  [{value:"18-21",label:"18–21"},{value:"22-25",label:"22–25"},{value:"26-29",label:"26–29"}],
  student:   [{value:"none",label:"Not a student"},{value:"cc",label:"Community college"},{value:"4yr",label:"4-year college"},{value:"grad",label:"Grad school"}],
  residency: [{value:"in-state",label:"In-state"},{value:"out-of-state",label:"Out-of-state"}],
  loans:     [{value:"federal",label:"Federal loans"},{value:"private",label:"Private loans"},{value:"none",label:"No loans"}],
  housing:   [{value:"renting",label:"I rent"},{value:"dorm",label:"Dorm"},{value:"family",label:"Live with family"},{value:"own",label:"I own"}],
  work:      [{value:"part-time",label:"Part-time"},{value:"full-time",label:"Full-time"},{value:"none",label:"Not working"}],
  transport: [{value:"car",label:"Car"},{value:"transit",label:"Transit"},{value:"bike-walk",label:"Bike / walk"}],
};

export const RANGE_OPTIONS = {
  rentRange: [{value:[0,1000],label:"Under $1,000"},{value:[1000,1500],label:"$1,000–1,500"},{value:[1500,2000],label:"$1,500–2,000"},{value:[2000,3000],label:"$2,000+"}],
  wageRange: [{value:[16,18],label:"$16–18/hr"},{value:[18,20],label:"$18–20/hr"},{value:[20,23],label:"$20–23/hr"},{value:[23,30],label:"$23+/hr"}],
};

// follow-up range asked right after a parent answer
export const FOLLOW_UPS = { housing: {when:"renting", field:"rentRange"}, work: {when:["part-time","full-time"], field:"wageRange"} };

export const FIELD_LABELS = { zip:"ZIP", state:"State", ageRange:"Age", student:"Student status", residency:"Residency", loans:"Student loans", housing:"Housing", rentRange:"Rent", work:"Work", wageRange:"Wage", transport:"Getting around" };

export const ASK_COPY = {   // question text used by ask-in-context and onboarding
  loans:{q:"Do you have student loans?", why:"Loan rules and payments change often. We only use this on your phone."},
  housing:{q:"Do you rent?", why:"Rent caps and tenant rules depend on this."},
  rentRange:{q:"What range is your rent?", why:"A range is enough. We never ask for the exact number."},
  work:{q:"Do you work?", why:"Minimum wage and labor rules depend on this."},
  wageRange:{q:"Roughly what do you make an hour?", why:"A range is enough."},
  transport:{q:"How do you get around?", why:"Fares, gas taxes, and tolls depend on this."},
};

export function labelFor(field, value) {
  const options = FIELD_OPTIONS[field] || RANGE_OPTIONS[field] || [];
  const key = JSON.stringify(value);
  const hit = options.find((o) => JSON.stringify(o.value) === key);
  return hit ? hit.label : String(value);
}
