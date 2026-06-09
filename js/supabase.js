// Supabase-ийн албан ёсны JavaScript сангийг (SDK) CDN-ээр дамжуулж ашиглах тохиргоо
// Энэ нь веб хуудсанд Supabase функцуудыг танихад тусална.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = "https://autwxqpprpqhyydzffzc.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1dHd4cXBwcnBxaHl5ZHpmZnpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NjkxNjMsImV4cCI6MjA5NjU0NTE2M30.YHxJh4qpQCAhczwZCLWA3Ri-GEZd-NEvyA9T9-Yl6rQ"; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (supabase.auth) {
    console.log("Холбогдсон байна!");
    console.log(supabase.auth);
}
