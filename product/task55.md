# Status: To Do
I am facing a bug to deal with positioning a task into an nested group of tasks

# Current behaviour 1:
1. Set up a nested group. E.g. task B is indented under task A like task A > Task B
2. Create a task C where task C is about the group: image.png
3. Dragging task C to Task B's outdent zone shows just 1 purple line which is correct
4. But upon release, Task C is positioned outside the task A > task B group like (task A > Task B) + task C image.png


# Expected behaviour 1:
- dragging task C into task B's outdent zone should indent task C in the task A > task B group where task C should be indented and proceed after task B like task A > (task B + task C)
- like this: image.png

# Current behaviour 2:
- similarly, if task C is below the group task A > task B, then releasing task C in task B's outdent zone causes task B to be indented under task C, leaving task A with no child: image.png

# Expected behaviour 2:
- doesn't matter if task C is above or below indent group, when i release task C in an indented task's outdent level, task C should proceed after the target task and indented under the parent