import { Body, Controller, Post } from '@nestjs/common';
import { BookingService } from './booking.service';
import { WooBookingRoot } from "@foxtrail-backend/directus";

@Controller('booking')
export class BookingController {
    constructor(private readonly bookingService: BookingService) {}

    @Post()
    async postWoocommerceBooking(@Body() body: WooBookingRoot): Promise<void> {
        await this.bookingService.newWoocommerceBooking(body);
    }
}
