import {Comment, Devvit} from "@devvit/public-api";

import {Scope} from "@devvit/protos";

Devvit.configure({
    redditAPI: true,
    userActions: {scopes: [Scope.SUBMIT_COMMENT]}
});

Devvit.addTrigger({
    event: "PostSubmit",
    async onEvent(event, context) {
        const post = event.post
        if (post === undefined) {
            return;
        }
        const id = post.id;
        if (id === undefined) {
            return;
        }
        const userId = post.authorId
        const comment = await context.reddit.submitComment({
            id: id,
            text: 'Hallo OP, bitte kommentiere die Quelle.',
            runAs: "USER"
        })
        await comment.distinguish(true)
    }
})

Devvit.addTrigger({
    event: "CommentCreate",
    async onEvent(event, context) {
        const comment = event.comment
        const post = event.post
        if (post === undefined || comment === undefined) {
            return;
        }
        if (comment.author === post.authorId) {
            console.log("User is OP")
            if (comment.parentId.startsWith("t1_")) {
                const botComment = await context.reddit.getCommentById(comment.parentId)
                if (botComment.body === "Hallo OP, bitte kommentiere die Quelle.") {
                    await botComment.lock()
                    const po = await context.reddit.getPostById(post.id)
                    await po.approve()
                    await botComment.edit({text: "Hier klicken um zur Quelle des Artikels zu kommen."})
                }
            }
        } else {
            console.log("Error comment author is not OP")
        }
    }
})

export default Devvit;
