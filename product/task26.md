Status: To do
## Bug
I am facing a bug where the outdent operation is not being triggered correctly.

## Current behaviour
- Currently triggering an outdent happens when you drag the parent task to the child task's red zone which is incorrect as seen in @image2.png
- This logic is reversed because the whole point of outdenting is to reduce the level of an indented task by 1


## Expected behaviour
- Given there is a Task D who is the parent of Task F e.g. Task D > Task F, then to trigger outdent user would drag Task F to Task D's red zone
    - Currently this is triggering an indent operation as seen in @image1.png
- When outdent operation is available, show regular purple line
- Upon release, the dragged task's level is reduced by 1
    E.g. in the @image1.png example, outcome is Task D + Task F on the same level
- Given that a parent-child relationship exist no matter how nested, user should never be able to drag the parent task into a child task
    - instead dragging a parent should select and drag all child and grandchildren and etc tasks as a block
    - with this block, you can either reorder and indent it under another task/block