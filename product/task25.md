Status: To do
## Bug
I am facing a bug where the "reorder" operation is not workign as intended

## Current behaviour
- Let's say there are 2 tasks: D and E on level 0 in that order
- If I drag Task E to Task D's red zone for reorder, I should see the reorder operation in the black indicator which is correct at the moment as seen in @image1.png
- But on upon release of Task E, Task E sits on top of Task D which is incorrect


## Expected behaviour
- When reordering, the dragged task should go below the target task as the purple line indicates where the dragged task should go
- E.g. in the @image1.png example, Task E should go after Task D so they're siblings: Task D + Task E