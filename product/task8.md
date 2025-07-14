# TASK-06: Fix Bug
Status: To do

## Bug
When I click on "Integrations" in the left sidenavbar, I get console errors saying user is not found

### Steps to reproduce:
1. go to /dashboard
2. click "Integrations" tab on left sidenavbar
3. check console errors

## Requirements
- user should be found as you have to be authorised to even be on /dashboard
- check why /slack/status ibs being called so early when CTA: "Connect" hasn't even been clicked yet

## Resources
### Browser logs
SlackIntegrationCard.tsx:76 
GET http://localhost:8000/api/integrations/slack/status 404 (NOT FOUND)
eval @ SlackIntegrationCard.tsx:76
await in eval
eval @ SlackIntegrationCard.tsx:253
commitHookEffectListMount @ react-dom.development.js:21102
invokePassiveEffectMountInDEV @ react-dom.development.js:23980
invokeEffectsInDev @ react-dom.development.js:26852
legacyCommitDoubleInvokeEffectsInDEV @ react-dom.development.js:26835
commitDoubleInvokeEffectsInDEV @ react-dom.development.js:26816
flushPassiveEffectsImpl @ react-dom.development.js:26514
flushPassiveEffects @ react-dom.development.js:26438
performSyncWorkOnRoot @ react-dom.development.js:24870
flushSyncWorkAcrossRoots_impl @ react-dom.development.js:7758
flushSyncWorkOnAllRoots @ react-dom.development.js:7718
commitRootImpl @ react-dom.development.js:26369
commitRoot @ react-dom.development.js:26077
commitRootWhenReady @ react-dom.development.js:24749
finishConcurrentRender @ react-dom.development.js:24714
performConcurrentWorkOnRoot @ react-dom.development.js:24559
workLoop @ scheduler.development.js:256
flushWork @ scheduler.development.js:225
performWorkUntilDeadline @ scheduler.development.js:534
SlackIntegrationCard.tsx:104 Error checking Slack status: Error: User not found
    at eval (SlackIntegrationCard.tsx:86:15)


### Network Response
http://localhost:3000/dashboard/integrations?_rsc=4aw5d - 0:["development",[["children","dashboard","children","integrations",["integrations",{"children":["__PAGE__",{}]}],null,null]]]
http://localhost:8000/api/integrations/slack/status - {
  "error": "User not found",
  "success": false
}
