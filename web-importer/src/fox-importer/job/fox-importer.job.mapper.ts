import {FoxCollection} from "@foxtrail-backend/directus";
import {Post} from "@foxtrail-backend/woocommerce";

export function transformJob(job: FoxCollection['jobs']): Post {
    const post: Post = {
        type: "jobs",
        status: "publish",
        title: job.title ?? '',
        // slug: createTermSlug(translation?.title, lang),
        content: job.description ?? '',
        // lang: lang,
        acf: {
            directus_id: job.id,
        }
    };
    /*if (translation_of) {
        term.translation_of = translation_of;
    }*/
    return post;
}
