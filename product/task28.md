Status: To do

## Bug
I am facing a bug where dragging a task into a parent's red zone causes indentation while dragging into a parent's green zone causes indentation in it's child task.

## Current behaviour
- Let's look at an example with the default state in @image.png
- When I try to drag Task E into Task F's red zone, it triggers indentation
- When I try to drag Task E into Task F's green zone, it triggers indentation under Task F which is correct as seen in @image2.png
    - But as I move further along the green zone of Task F, the indentation moves to child Task D which is incorrect as seen in image3.png
    - Maybe this is because of old logic where I wanted indentation at 30% width?

## Expected behaviour
- Dragging Task E into Task F's red zone should trigger reorder
    - Upon release, Task E is positioned after Task F's block 
    - E.g. (Task F > Task D) + Task E as siblings
- Dragging Task E into Task F's green zone should always trigger indentation
    - Upon release, Task E is indented under Task F as the first child
    - E.g. Task F > (Task E + Task D)