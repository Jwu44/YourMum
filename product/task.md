[ ] Debug this error when I submit the formdata for schedule generation: "203-c696639c29fea4e1.js:1 
        
        
       POST https://yourdai.be/api/submit_data 500 (Internal Server Error)
u @ 203-c696639c29fea4e1.js:1
(anonymous) @ page-602f5d0e4d3eb1fa.js:1
a_ @ fd9d1056-4eaa1cb44a8df49f.js:1
aR @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
sF @ fd9d1056-4eaa1cb44a8df49f.js:1
sM @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
o4 @ fd9d1056-4eaa1cb44a8df49f.js:1
iV @ fd9d1056-4eaa1cb44a8df49f.js:1
sU @ fd9d1056-4eaa1cb44a8df49f.js:1
uR @ fd9d1056-4eaa1cb44a8df49f.js:1
uM @ fd9d1056-4eaa1cb44a8df49f.js:1
23-e90de6ae16e42b99.js:1 Error submitting form: Error: Network response was not ok
    at u (203-c696639c29fea4e1.js:1:6118)
    at async page-602f5d0e4d3eb1fa.js:1:974
window.console.error @ 23-e90de6ae16e42b99.js:1
u @ 203-c696639c29fea4e1.js:1
await in u
(anonymous) @ page-602f5d0e4d3eb1fa.js:1
a_ @ fd9d1056-4eaa1cb44a8df49f.js:1
aR @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
sF @ fd9d1056-4eaa1cb44a8df49f.js:1
sM @ fd9d1056-4eaa1cb44a8df49f.js:1
(anonymous) @ fd9d1056-4eaa1cb44a8df49f.js:1
o4 @ fd9d1056-4eaa1cb44a8df49f.js:1
iV @ fd9d1056-4eaa1cb44a8df49f.js:1
sU @ fd9d1056-4eaa1cb44a8df49f.js:1
uR @ fd9d1056-4eaa1cb44a8df49f.js:1
uM @ fd9d1056-4eaa1cb44a8df49f.js:1
23-e90de6ae16e42b99.js:1 Error submitting form: Error: Network response was not ok
    at u (203-c696639c29fea4e1.js:1:6118)
    at async page-602f5d0e4d3eb1fa.js:1:974"

Steps to replicate:
1. Click "get started" on home page
2. Go through google sso flow
3. After successful sign go through the onboarding flow
4. Bug: user clicks "generate schedule" button on /timebox-preference

Expected outcome: 
- formdata is passed to generate_schedule 
- schedule is generated and stored in db
