import { Injectable, Logger } from '@nestjs/common';
import { DirectusService, WooBookingRoot } from '@foxtrail-backend/directus';
import { SlotService } from '../slot/slot.service';
import { PrismaService } from '@foxtrail-backend/prisma';

@Injectable()
export class BookingService {
    private readonly logger = new Logger(BookingService.name);

    constructor(
        private readonly directusService: DirectusService, //
        private readonly prismaService: PrismaService,
        private readonly slotService: SlotService,
    ) {}

    async newWoocommerceBooking(body: WooBookingRoot) {
        this.logger.log('New Woocommerce Booking!');
        this.logger.log(body);

        if (body.id === undefined) {
            throw new Error('Order id not found');
        } else if (body.status !== 'completed') {
            this.logger.log(`Order with id ${body.id} is not completed, skipping...`);
            return;
        }

        const order = await this.prismaService.order.findUnique({
            where: {
                id: body.id,
            },
            rejectOnNotFound: false,
        });
        if (order != null) {
            this.logger.log(`Order with id ${body.id} already exists, skipping...`);
            return;
        }

        const birthday = body.meta_data.find((meta) => meta.key === '_billing_customer_birthday')?.value ?? null;
        let contact = await this.directusService.getContact(body.billing.email);
        if (!contact) {
            this.logger.log('Contact not found, creating new one...');
            contact = await this.directusService.createContact(body, birthday);
        } else {
            this.logger.log(`Contact with id ${contact.id} found, updating...`);
            contact = await this.directusService.updateContact(contact.id, body, birthday);
        }
        if (contact != null) {
            // Create the booking entry in Directus
            try {
                await this.directusService.createBooking(contact, body);
                for (const item of body.line_items) {
                    // ...and close the slot
                    const metaValue = item.meta_data.find((meta) => meta.key === 'meta')?.value;
                    const slotId: number | undefined = metaValue.time_slot.slotId;
                    if (slotId) {
                        await this.slotService.updateSlot(slotId, {
                            stage: 'sold',
                        });
                    } else {
                        this.logger.error('SlotId not found in meta data');
                        this.logger.log(body);
                    }
                }
            } catch (e) {
                this.logger.log('Booking already exists, skipping...');
                this.logger.warn(e);
            }
        } else {
            throw new Error("Contact couldn't be created");
        }
    }
}
