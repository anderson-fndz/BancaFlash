import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://owawmttiqrhmzodoxrwd.supabase.co'
const supabaseKey = 'sb_publishable_EJdUK61GFKF1TVH_Cx2OPg_fyzR9UWk'

export const supabase = createClient(supabaseUrl, supabaseKey)