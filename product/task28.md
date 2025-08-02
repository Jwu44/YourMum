Status: To do

## Bug
I am facing a bug where dragging a task into a child's redzone causes indent when it should be an indent + reorder.

## Current behaviour
- Let's look at an example with the default state in @image.png
- When I try to drag Task D into Task C's red zone, it triggers outdent as seen in @image1.png
- Upon release, Task D becomes a parent of Task C and is outdented as seen in @image2.png 


## Expected behaviour
- Dragging Task D into Task C's red zone should trigger an indent under Task A but a reorder after Task C
    e.g. Upon release, list should be: Task A > Task B + Task C + Task D, where all B, C and D are subtasks of Task A
- Dragging Task D into Task B's red zone should trigger an indent under Task A but a reorder after Task B
    e.g. Upon release, list should be: Task A > Task B + Task D + Task C, where all B, C and D are subtasks of Task 
- Ensure all other drag functions/logic are preserved
    e.g. - Current dragging of Task D into subtask green zone are correct where indent is triggered