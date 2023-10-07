import { Injectable } from '@nestjs/common';
import { EventLocation, Screen, TrailExportDto } from './types/trail-export.dto';
import { PrismaService } from '@foxtrail-backend/prisma';

@Injectable()
export class AppService {
    constructor(private prismaService: PrismaService) {}

    async updateTrail(trail: TrailExportDto, targetLanguage: string) {
        // ...handle trail specific translations
        await this.handleTrail(trail, targetLanguage);
        for (const eventLocation of trail.event_locations) {
            // ...handle event location specific translations, including screens
            await this.handleEventLocation(eventLocation, targetLanguage);
        }
    }

    private async handleTrail(trail: TrailExportDto, targetLanguage: string) {
        const trailTranslationFilter = {
            trails_identifier_languages_code: {
                languages_code: targetLanguage,
                trails_identifier: trail.identifier,
            },
        };
        const trails_translations = {
            startlocation_name: trail.translations.startlocation_name,
            startlocation_address: trail.translations.startlocation_address,
        };
        const trails_translations_1 = {
            find_back: trail.translations.find_back,
        };
        const trails_translations_3 = {
            short_description: trail.translations.short_description,
            city_description: trail.translations.city_description,
            city_name_suffix: trail.translations.city_name_suffix,
            notes: trail.translations.notes,
        };

        await this.prismaService.trails.update({
            where: {
                identifier: trail.identifier,
            },
            data: {
                trails_translations: {
                    upsert: {
                        where: trailTranslationFilter,
                        update: trails_translations,
                        create: {
                            ...trails_translations,
                            languages_code: targetLanguage,
                        },
                    },
                },
                trails_translations_1: {
                    upsert: {
                        where: trailTranslationFilter,
                        update: trails_translations_1,
                        create: {
                            ...trails_translations_1,
                            languages_code: targetLanguage,
                        },
                    },
                },
                trails_translations_3: {
                    upsert: {
                        where: trailTranslationFilter,
                        update: trails_translations_3,
                        create: {
                            ...trails_translations_3,
                            languages_code: targetLanguage,
                        },
                    },
                },
            },
        });
    }

    private async handleEventLocation(eventLocation: EventLocation, languageCode: string) {
        const event_location_translations_2 = {
            find_text: eventLocation.translations.find_text,
            name: eventLocation.translations.name,
        };
        const event_location_translations_1 = {
            note_title: eventLocation.translations.note_title,
            note_description: eventLocation.translations.note_description,
        };
        await this.prismaService.event_location.update({
            where: {
                uuid: eventLocation.uuid,
            },
            data: {
                event_location_translations_1: {
                    upsert: {
                        where: {
                            event_location_identifier_languages_code: {
                                event_location_identifier: eventLocation.uuid,
                                languages_code: languageCode,
                            },
                        },
                        update: event_location_translations_1,
                        create: {
                            ...event_location_translations_1,
                            languages_code: languageCode,
                        },
                    },
                },
                event_location_translations_2: {
                    upsert: {
                        where: {
                            event_location_uuid_languages_code: {
                                event_location_uuid: eventLocation.uuid,
                                languages_code: languageCode,
                            },
                        },
                        update: event_location_translations_2,
                        create: {
                            ...event_location_translations_2,
                            //event_location_uuid: eventLocation.uuid,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });

        await this.handleScreens(eventLocation.screens, languageCode);
        await this.handleScreens(eventLocation.team_tasks, languageCode);
    }

    private async handleScreens(screens: Screen[], languageCode: string) {
        for (const screen of screens) {
            switch (screen.type) {
                case 'info_screen':
                    await this.handleInfoScreen(screen, languageCode);
                    break;
                case 'single_choice_quiz':
                    await this.handleSingleChoiceQuiz(screen, languageCode);
                    break;
                case 'crossword':
                    await this.handleCrossword(screen, languageCode);
                    break;
                case 'image_choice_quiz':
                    await this.handleImageChoiceQuiz(screen, languageCode);
                    break;
                case 'photo_challenge':
                    await this.handlePhotoChallenge(screen, languageCode);
                    break;
                case 'estimation_slider_screen':
                    await this.handleEstimationSliderScreen(screen, languageCode);
                    break;
                case 'sort_quiz':
                    await this.handleSortQuiz(screen, languageCode);
                    break;
                default:
                    throw new Error(`Unknown screen type: ${screen.type}`);
            }
        }
    }

    private async handleSingleChoiceQuiz(screen: Screen, languageCode: string) {
        const single_choice_quiz_translations = {
            question: screen.translations.question,
            hint: screen.translations.hint,
        };
        const single_choice_quiz_translations_2 = {
            explanation: screen.translations.explanation,
        };
        await this.prismaService.single_choice_quiz.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                single_choice_quiz_translations: {
                    upsert: {
                        where: {
                            single_choice_quiz_identifier_languages_code: {
                                single_choice_quiz_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: single_choice_quiz_translations,
                        create: {
                            ...single_choice_quiz_translations,
                            languages_code: languageCode,
                        },
                    },
                },
                single_choice_quiz_translations_2: {
                    upsert: {
                        where: {
                            single_choice_quiz_identifier_languages_code: {
                                single_choice_quiz_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: single_choice_quiz_translations_2,
                        create: {
                            ...single_choice_quiz_translations_2,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
        const answers = screen.answers;
        if (answers !== undefined && answers.length > 0) {
            for (const answer of answers) {
                const answer_translation = {
                    answer: answer.answer,
                };
                await this.prismaService.answers.update({
                    where: {
                        id: answer.id,
                    },
                    data: {
                        answers_translations: {
                            upsert: {
                                where: {
                                    languages_code_answers_id: {
                                        answers_id: answer.id,
                                        languages_code: languageCode,
                                    },
                                },
                                update: answer_translation,
                                create: {
                                    ...answer_translation,
                                    languages_code: languageCode,
                                },
                            },
                        },
                    },
                });
            }
        }
    }

    private async handleInfoScreen(screen: Screen, languageCode: string) {
        const info_screen_translations = {
            title: screen.translations.title,
            description: screen.translations.description,
        };
        await this.prismaService.info_screen.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                info_screen_translations: {
                    upsert: {
                        where: {
                            info_screen_identifier_languages_code: {
                                info_screen_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: info_screen_translations,
                        create: {
                            ...info_screen_translations,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
    }

    private async handleCrossword(screen: Screen, languageCode: string) {
        await this.prismaService.crossword.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                crossword_translations: {
                    upsert: {
                        where: {
                            crossword_identifier_languages_code: {
                                crossword_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: {
                            question: screen.translations.question,
                            hint: screen.translations.hint,
                        },
                        create: {
                            question: screen.translations.question,
                            hint: screen.translations.hint,
                            languages_code: languageCode,
                        },
                    },
                },
                crossword_translations_4: {
                    upsert: {
                        where: {
                            crossword_identifier_languages_code: {
                                crossword_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: {
                            solution: screen.translations.solution,
                        },
                        create: {
                            solution: screen.translations.solution,
                            languages_code: languageCode,
                        },
                    },
                },
                crossword_translations_3: {
                    upsert: {
                        where: {
                            crossword_identifier_languages_code: {
                                crossword_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: {
                            explanation: screen.translations.explanation,
                        },
                        create: {
                            explanation: screen.translations.explanation,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
    }

    private async handleImageChoiceQuiz(screen: Screen, languageCode: string) {
        const image_choice_quiz_translations = {
            question: screen.translations.question,
            hint: screen.translations.hint,
        };
        const image_choice_quiz_translations_2 = {
            explanation: screen.translations.explanation,
        };
        await this.prismaService.image_choice_quiz.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                image_choice_quiz_translations: {
                    upsert: {
                        where: {
                            image_choice_quiz_identifier_languages_code: {
                                image_choice_quiz_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: image_choice_quiz_translations,
                        create: {
                            ...image_choice_quiz_translations,
                            languages_code: languageCode,
                        },
                    },
                },
                image_choice_quiz_translations_2: {
                    upsert: {
                        where: {
                            image_choice_quiz_identifier_languages_code: {
                                image_choice_quiz_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: image_choice_quiz_translations_2,
                        create: {
                            ...image_choice_quiz_translations_2,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
    }

    private async handlePhotoChallenge(screen: Screen, languageCode: string) {
        const photo_challenge_translations = {
            description: screen.translations.description,
        };
        await this.prismaService.photo_challenge.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                photo_challenge_translations: {
                    upsert: {
                        where: {
                            photo_challenge_identifier_languages_code: {
                                photo_challenge_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: photo_challenge_translations,
                        create: {
                            ...photo_challenge_translations,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
    }

    private async handleSortQuiz(screen: Screen, languageCode: string) {
        const sortQuizTranslationFilter = {
            sort_quiz_identifier_languages_code: {
                sort_quiz_identifier: screen.identifier,
                languages_code: languageCode,
            },
        };
        const sort_quiz_translations = {
            question: screen.translations.question,
            hint: screen.translations.hint,
        };
        const sort_quiz_translations_1 = {
            explanation: screen.translations.explanation,
        };
        await this.prismaService.sort_quiz.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                sort_quiz_translations: {
                    upsert: {
                        where: sortQuizTranslationFilter,
                        update: sort_quiz_translations,
                        create: {
                            ...sort_quiz_translations,
                            languages_code: languageCode,
                        },
                    },
                },
                sort_quiz_translations_1: {
                    upsert: {
                        where: sortQuizTranslationFilter,
                        update: sort_quiz_translations_1,
                        create: {
                            ...sort_quiz_translations_1,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });

        const answers = screen.answers;
        if (answers !== undefined && answers.length > 0) {
            for (const answer of answers) {
                const answer_translation = {
                    answer: answer.answer,
                };
                await this.prismaService.sort_answer.update({
                    where: {
                        id: answer.id,
                    },
                    data: {
                        sort_answer_translations_1: {
                            upsert: {
                                where: {
                                    languages_code_sort_answer_id: {
                                        sort_answer_id: answer.id,
                                        languages_code: languageCode,
                                    },
                                },
                                update: answer_translation,
                                create: {
                                    ...answer_translation,
                                    languages_code: languageCode,
                                },
                            },
                        },
                    },
                });
            }
        }
    }

    private async handleEstimationSliderScreen(screen: Screen, languageCode: string) {
        const estimation_slider_screen_translations = {
            question: screen.translations.question,
            hint: screen.translations.hint,
        };
        const estimation_slider_screen_translations_2 = {
            explanation: screen.translations.explanation,
        };
        await this.prismaService.estimation_slider_screen.update({
            where: {
                identifier: screen.identifier,
            },
            data: {
                estimation_slider_screen_translations: {
                    upsert: {
                        where: {
                            estimation_slider_screen_identifier_languages_code: {
                                estimation_slider_screen_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: estimation_slider_screen_translations,
                        create: {
                            ...estimation_slider_screen_translations,
                            languages_code: languageCode,
                        },
                    },
                },
                estimation_slider_screen_translations_2: {
                    upsert: {
                        where: {
                            estimation_slider_screen_identifier_languages_code: {
                                estimation_slider_screen_identifier: screen.identifier,
                                languages_code: languageCode,
                            },
                        },
                        update: estimation_slider_screen_translations_2,
                        create: {
                            ...estimation_slider_screen_translations_2,
                            languages_code: languageCode,
                        },
                    },
                },
            },
        });
    }

    // async createPhaseProject(trailExportDto: TrailExportDto, fromLanguage: string, targetLanguages: string[]) {
    //     const auth = await phraseClient.authentication.login({
    //         userName: 'explorial',
    //         password: 'Tweezers-Poster-Grime7',
    //     });
    //
    //     const token = auth.token;
    //     if (token === undefined) {
    //         throw new Error('Could not login to explorial');
    //     } else {
    //         console.log('logged in');
    //         phraseClient.request.config.HEADERS = {
    //             Authorization: `ApiToken ${token}`,
    //         };
    //
    //         try {
    //             const project = await phraseClient.project.createProjectV3({
    //                 name: trailExportDto.identifier,
    //                 sourceLang: fromLanguage,
    //                 targetLangs: targetLanguages,
    //             });
    //         } catch (e) {
    //             console.log(e);
    //         }
    //     }
    // }
}
