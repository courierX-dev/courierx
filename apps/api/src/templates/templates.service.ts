import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTemplate, UpdateTemplate } from '@courierx/shared';
import Handlebars from 'handlebars';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateTemplate, productId: string) {
    // Check for duplicate template name
    const existing = await this.prisma.template.findUnique({
      where: {
        productId_name: {
          productId,
          name: data.name,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Template with name "${data.name}" already exists`);
    }

    // Validate template syntax
    try {
      Handlebars.compile(data.subjectTpl);
      Handlebars.compile(data.htmlTpl);
    } catch (error) {
      throw new BadRequestException(`Invalid template syntax: ${(error as Error).message}`);
    }

    return this.prisma.template.create({
      data: {
        productId,
        name: data.name,
        engine: data.engine || 'hbs',
        subjectTpl: data.subjectTpl,
        htmlTpl: data.htmlTpl,
      },
    });
  }

  async findAll(productId: string) {
    return this.prisma.template.findMany({
      where: {
        productId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string, productId: string) {
    const template = await this.prisma.template.findFirst({
      where: {
        id,
        productId,
      },
    });

    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }

    return template;
  }

  async update(id: string, data: UpdateTemplate, productId: string) {
    // Check template exists
    await this.findOne(id, productId);

    // Check for name conflicts if name is being updated
    if (data.name) {
      const existing = await this.prisma.template.findFirst({
        where: {
          productId,
          name: data.name,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException(`Template with name "${data.name}" already exists`);
      }
    }

    // Validate template syntax if being updated
    if (data.subjectTpl || data.htmlTpl) {
      try {
        if (data.subjectTpl) Handlebars.compile(data.subjectTpl);
        if (data.htmlTpl) Handlebars.compile(data.htmlTpl);
      } catch (error) {
        throw new BadRequestException(`Invalid template syntax: ${(error as Error).message}`);
      }
    }

    return this.prisma.template.update({
      where: {
        id,
      },
      data,
    });
  }

  async remove(id: string, productId: string) {
    // Check template exists
    await this.findOne(id, productId);

    await this.prisma.template.delete({
      where: {
        id,
      },
    });

    return { message: 'Template deleted successfully' };
  }

  /**
   * Render a template with variables
   */
  async render(id: string, variables: Record<string, any>, productId: string) {
    const template = await this.findOne(id, productId);

    try {
      const subjectTemplate = Handlebars.compile(template.subjectTpl);
      const htmlTemplate = Handlebars.compile(template.htmlTpl);

      return {
        subject: subjectTemplate(variables),
        html: htmlTemplate(variables),
      };
    } catch (error) {
      throw new BadRequestException(`Template rendering failed: ${(error as Error).message}`);
    }
  }
}
