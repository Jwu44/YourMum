[ ] Debug this error when I click on a task to be decomposed: "203-65e1cdc151f29704.js:1 
        
        
       POST https://yourdai.be/api/tasks/decompose 405 (Method Not Allowed)
j @ 203-65e1cdc151f29704.js:1
(anonymous) @ page-66c3735d8601cf3e.js:1
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
23-e90de6ae16e42b99.js:1 Error decomposing task: SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON"

Steps to replicate:
1. Go to /dashboard
2. View generated schedule
3. Click on a task to be decomposed
4. Bug: I get a 405 error

Expected outcome: 
- decompose api call is successful
- task is decomposed