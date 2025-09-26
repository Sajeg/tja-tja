import {Comment, Devvit} from "@devvit/public-api";

import {Scope} from "@devvit/protos";

Devvit.configure({
    redditAPI: true,
    userActions: {scopes: [Scope.SUBMIT_COMMENT]}
});

export type PostSourceCheck = {
    postId: string;
    comment: Comment;
    userId: string;
}

let postsWithoutSource : PostSourceCheck[] = []

Devvit.addTrigger({
    event: "PostSubmit",
    async onEvent(event, context) {
        console.log("PostSubmit event:", event);
        const post = event.post
        if (post === undefined) {
            console.log("post not found");
            return;
        }
        const id = post.id;
        if (id === undefined) {
            console.log("postId must be provided");
            return;
        }
        const userId = post.authorId
        console.log("All checks passed");
        const comment = await context.reddit.submitComment({
            id: id,
            text: 'Hallo OP, bitte kommentiere die Quelle.',
            runAs: "USER"
        })
        postsWithoutSource.push({
            postId: post.id,
            comment: comment,
            userId: userId
        })
        await comment.distinguish(true)
            const commentSource= await context.scheduler.runJob({
            name: 'checkNewPosts',
            data: {
                commentId: comment.id,
            },
            when: new Date(Date.now() + 5000) // in 5 seconds
        })
    }
})

Devvit.addTrigger({
    event: "CommentCreate",
    async onEvent(event, context) {
        console.log("New comment");
        const comment = event.comment
        for (const post of postsWithoutSource) {
            console.log("Now handling post: ", post);
            if (context.userId === post.userId) {
                const replies = await post.comment.replies.all()
                replies.forEach(reply => {
                    if (reply.id === context.commentId) {
                        post.comment.edit({ text: 'Hier kommst du zur Quelle des Artikels'});
                        post.comment.lock()
                        context.reddit.approve(post.postId);
                    } else {
                        reply.remove()
                    }
                })
            } else {
                console.log("Error comment author is not OP")
            }
        }
    }
})

Devvit.addSchedulerJob({
    name: 'checkForSource',
    onRun: async (event, context) => {
        const data = event.data
        if (data === undefined) {
            return;
        }
        const commentId = data.commentId
    }
})

export default Devvit;
